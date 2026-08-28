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
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(d: Date | null) {
  if (!d) return "--/--/----";
  return d.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
