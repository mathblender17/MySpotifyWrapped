// Dev tools: drive headless Chrome over the DevTools protocol (Node 24 global WebSocket, no dependencies).
// Headless windows can't go below ~500 px wide, so phone sizes use device-metrics emulation instead.
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Open `url` in an emulated phone; returns { send, close }. */
export async function openPage(url, { width = 390, height = 844, scale = 2 } = {}) {
  const port = 9333 + Math.floor(Math.random() * 500);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/cdp-prof-${port}`,
    '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 50 && !ws; i++) {
    try {
      ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch {
      await sleep(200);
    }
  }
  if (!ws) throw new Error('Chrome did not start');
  const sock = new WebSocket(ws);
  await new Promise((r) => sock.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  sock.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
  await send('Page.enable');
  await send('Page.navigate', { url });
  return { send, sleep, close: () => (sock.close(), chrome.kill()) };
}
