import { expect, test } from 'vitest';
import { silentWav } from '../../src/audio/silent';

test('a silent clip is a valid WAV of the asked length', () => {
  const url = silentWav(3);
  expect(url.startsWith('data:audio/wav;base64,')).toBe(true);
  const bytes = atob(url.split(',')[1]);
  expect(bytes.slice(0, 4)).toBe('RIFF');
  expect(bytes.length).toBe(44 + 3 * 8000); // 8 kHz, 8-bit mono
});
