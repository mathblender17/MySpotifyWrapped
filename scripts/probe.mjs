// usage: node scripts/probe.mjs <url> <script.js> [waitMs] [width] [height]
// Evaluates the script (an expression, usually an async IIFE) in the page and prints its JSON result.
import { readFileSync } from 'node:fs';
import { openPage } from './cdp.mjs';

const [url, file, wait = '1500', w = '390', h = '844'] = process.argv.slice(2);
const page = await openPage(url, { width: +w, height: +h });
await page.sleep(+wait);
const r = await page.send('Runtime.evaluate', { expression: readFileSync(file, 'utf8'), awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(r.result.exceptionDetails ?? r.result.result.value, null, 1));
page.close();
