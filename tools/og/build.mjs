/**
 * The link preview image, rendered from tools/og/open-graph.html.
 *
 *   yarn og:build
 *
 * Writes assets/images/open-graph.jpg, which `config/metadata.ts` points every page's Open Graph and
 * Twitter card at. A JPEG, not a PNG: WhatsApp drops previews much over 300 KB, and a photograph
 * compresses an order of magnitude better as a JPEG.
 */
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', '..', 'assets', 'images', 'open-graph.jpg');

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 630, width: 1200 } });
await page.goto(`file://${path.join(here, 'open-graph.html')}`);
await page.evaluate(() => document.fonts.ready);
await (await page.$('.card')).screenshot({ path: out, quality: 88, type: 'jpeg' });
await browser.close();

console.log(`assets/images/open-graph.jpg — ${Math.round(statSync(out).size / 1024)} KB`);
