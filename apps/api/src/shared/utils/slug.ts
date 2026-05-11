/**
 * Converte um nome em slug url-friendly. Remove acentos, espaços, símbolos.
 * Ex: "Box Piloto - CrossFit & Hyrox" → "box-piloto-crossfit-hyrox"
 */
export function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')     // remove combining diacritical marks
    .replace(/[^a-z0-9\s-]/g, '')       // remove símbolos
    .trim()
    .replace(/\s+/g, '-')               // espaços → hífens
    .replace(/-+/g, '-')                // hífens duplicados → único
    .slice(0, 60)
}
