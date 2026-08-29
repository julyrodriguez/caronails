// src/lib/normalize.ts
export function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function fmtMoney(n: number = 0) {
  return Number(n || 0).toLocaleString("es-AR");
}

export function fmtTime(d: Date | null) {
  if (!d) return "--:--";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function fmtDate(d: Date | null) {
  if (!d) return "--/--/----";
  return d.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
