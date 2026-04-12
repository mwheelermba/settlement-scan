import { exportProfileJson } from "./profile";
import type { UserProfile } from "./types";

/** Chromium File System Access — permission helpers not in all TS DOM libs. */
type FileHandleWithPermissions = FileSystemFileHandle & {
  queryPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
};

type PickerSaveResult = "saved" | "cancelled" | "unsupported";

let sessionBackupHandle: FileSystemFileHandle | null = null;

export function getSessionBackupFileHandle(): FileSystemFileHandle | null {
  return sessionBackupHandle;
}

export function clearSessionBackupFileHandle(): void {
  sessionBackupHandle = null;
}

type ShowSaveFilePickerFn = (options: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

function getShowSaveFilePicker(): ShowSaveFilePickerFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { showSaveFilePicker?: ShowSaveFilePickerFn }).showSaveFilePicker;
}

function hasShowSaveFilePicker(): boolean {
  return typeof getShowSaveFilePicker() === "function";
}

async function writeToHandle(handle: FileSystemFileHandle, profile: UserProfile): Promise<void> {
  const json = exportProfileJson(profile);
  const writable = await handle.createWritable();
  try {
    await writable.write(json);
  } finally {
    await writable.close();
  }
}

/** Try to sync profile to the in-session file handle (user chose a file earlier this session). */
export async function writeProfileToSessionHandle(profile: UserProfile): Promise<boolean> {
  if (!sessionBackupHandle) return false;
  const h = sessionBackupHandle as FileHandleWithPermissions;
  try {
    let perm: PermissionState = "granted";
    if (h.queryPermission) {
      perm = await h.queryPermission({ mode: "readwrite" });
    }
    if (perm === "prompt" && h.requestPermission) {
      perm = await h.requestPermission({ mode: "readwrite" });
    }
    if (perm !== "granted") {
      sessionBackupHandle = null;
      return false;
    }
    await writeToHandle(sessionBackupHandle, profile);
    return true;
  } catch {
    sessionBackupHandle = null;
    return false;
  }
}

/** Pick a file (or replace handle) and write — enables one-tap / auto sync for this session. */
export async function pickFileAndSaveProfile(profile: UserProfile): Promise<PickerSaveResult> {
  const picker = getShowSaveFilePicker();
  if (!picker) return "unsupported";
  try {
    const handle = await picker({
      suggestedName: "settlementscan-profile.json",
      types: [
        {
          description: "JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    await writeToHandle(handle, profile);
    sessionBackupHandle = handle;
    return "saved";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
    return "unsupported";
  }
}

/** Classic download — works everywhere; may create settlementscan-profile (1).json in some browsers. */
export function downloadProfileJsonFile(profile: UserProfile): void {
  const blob = new Blob([exportProfileJson(profile)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "settlementscan-profile.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Prefer session file sync, then pick file, then download.
 * Returns how the backup was written.
 */
export async function performProfileBackup(
  profile: UserProfile
): Promise<"session_file" | "picked_file" | "download" | "cancelled"> {
  if (await writeProfileToSessionHandle(profile)) {
    return "session_file";
  }
  if (hasShowSaveFilePicker()) {
    const result = await pickFileAndSaveProfile(profile);
    if (result === "saved") return "picked_file";
    if (result === "cancelled") return "cancelled";
  }
  downloadProfileJsonFile(profile);
  return "download";
}
