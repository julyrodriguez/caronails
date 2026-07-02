// src/lib/normalize.ts
export function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .replace(/\s+/g, " ");
}