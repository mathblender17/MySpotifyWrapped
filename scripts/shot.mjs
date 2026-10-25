// usage: node scripts/shot.mjs <url> <out.png> [waitMs] [width] [height]
import { writeFileSync } from 'node:fs';
import { openPage } from './cdp.mjs';

const [url, out, wait = '2000', w = '390', h = '844'] = process.argv.slice(2);
const page = await openPage(url, { width: +w, height: +h });
await page.sleep(+wait);
const r = await page.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(r.result.data, 'base64'));
page.close();
console.log('wrote', out);
