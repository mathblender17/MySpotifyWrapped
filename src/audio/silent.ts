/** A silent WAV of `seconds` (8 kHz, 8-bit mono) as a data URL. Dev check only: stands in for 30 s previews. */
export function silentWav(seconds: number): string {
  const n = Math.round(seconds * 8000);
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const tag = (at: number, s: string) => [...s].forEach((c, i) => (b[at + i] = c.charCodeAt(0)));
  tag(0, 'RIFF'); v.setUint32(4, 36 + n, true); tag(8, 'WAVE');
  tag(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  tag(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44); // 8-bit silence is the midpoint
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return `data:audio/wav;base64,${btoa(s)}`;
}
