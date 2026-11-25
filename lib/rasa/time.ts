export function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return h12 + (mm ? `:${String(mm).padStart(2, "0")}` : "") + ` ${ap}`;
}

export function durMinutes(a: number, b: number): string {
  const d = b - a;
  const h = Math.floor(d / 60);
  const m = d % 60;
  return (
    (h ? h + (h > 1 ? " hrs" : " hr") : "") +
    (h && m ? " " : "") +
    (m ? `${m} min` : "")
  );
}

export function countdownDays(): number {
  const start = new Date(2027, 0, 8);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((start.getTime() - today.getTime()) / 864e5);
}