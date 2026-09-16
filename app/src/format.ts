export function km(metres: number, digits = 1): string {
  return (metres / 1000).toFixed(digits);
}

export function duration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "5:30" per km, or an en dash when unknown. */
export function pace(secondsPerKm: number | null | undefined): string {
  if (!secondsPerKm || !isFinite(secondsPerKm) || secondsPerKm > 3600) return '–';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

export function shortDistance(metres: number): string {
  if (metres >= 1000) return `${km(metres)} km`;
  return `${Math.max(0, Math.round(metres / 10) * 10)} m`;
}

export function date(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Estimated time for a distance at a typical 5:30 per km. */
export function estimate(metres: number, secondsPerKm = 330): string {
  const minutes = Math.round(((metres / 1000) * secondsPerKm) / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
