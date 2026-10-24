export type Route = { data?: 'demo'; station?: number; year?: number };

/** Dev shortcut: ?data=demo&station=N&year=YYYY opens straight at a station. */
export function parseRoute(search: string): Route {
  const q = new URLSearchParams(search);
  const r: Route = {};
  if (q.get('data') === 'demo') r.data = 'demo';
  const station = Number(q.get('station'));
  if (Number.isInteger(station) && station >= 1 && station <= 13) r.station = station;
  const year = Number(q.get('year'));
  if (q.has('year') && Number.isInteger(year)) r.year = year;
  return r;
}
