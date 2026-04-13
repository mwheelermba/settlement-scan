/**
 * Exports each "sheet" in public/overview.html to a PNG for LinkedIn (carousel, posts).
 *
 * Usage (from repo root):
 *   npm install
 *   npm run overview:pngs
 *
 * Output: public/overview-linkedin/sheet-01.png ... sheet-06.png
 *
 * Requires: puppeteer (downloads Chromium on first npm install of puppeteer).
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    console.error(
      "Missing puppeteer. Run: npm install\nThen re-run: npm run overview:pngs"
    );
    process.exit(1);
  }

  const root = path.join(__dirname, "..");
  const htmlPath = path.join(root, "public", "overview.html");
  if (!fs.existsSync(htmlPath)) {
    console.error("Missing file:", htmlPath);
    process.exit(1);
  }

  const outDir = path.join(root, "public", "overview-linkedin");
  fs.mkdirSync(outDir, { recursive: true });

  const fileUrl = pathToFileURL(htmlPath).href;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    // 8.5in @ 96 CSS px/in + 2x for sharp social images (~1632px wide exports)
    await page.setViewport({
      width: 880,
      height: 1600,
      deviceScaleFactor: 2,
    });

    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 120000 });

    const sheets = await page.$$(".sheet");
    if (sheets.length === 0) {
      console.error("No .sheet elements found in overview.html");
      process.exit(1);
    }

    for (let i = 0; i < sheets.length; i++) {
      const outName = `sheet-${String(i + 1).padStart(2, "0")}.png`;
      const outPath = path.join(outDir, outName);
      await sheets[i].screenshot({
        path: outPath,
        type: "png",
      });
      console.log("Wrote", outPath);
    }

    console.log(
      "\nDone.",
      sheets.length,
      "PNGs in public/overview-linkedin/\nUse them in a LinkedIn carousel or single images; 2x scale helps on retina."
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
