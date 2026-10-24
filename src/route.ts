export type Route = { data?: 'demo'; station?: number; year?: number; world?: true };

/** Dev shortcuts: ?data=demo&station=N&year=YYYY opens straight at a station; ?world=1&station=N previews a 3D district. */
export function parseRoute(search: string): Route {
  const q = new URLSearchParams(search);
  const r: Route = {};
  if (q.get('data') === 'demo') r.data = 'demo';
  if (q.get('world') === '1') r.world = true;
  const station = Number(q.get('station'));
  if (Number.isInteger(station) && station >= 1 && station <= 13) r.station = station;
  const year = Number(q.get('year'));
  if (q.has('year') && Number.isInteger(year)) r.year = year;
  return r;
}
