/**
 * Normaliza un teléfono mexicano al formato canónico 521XXXXXXXXXX (13 dígitos).
 * Acepta: 10 dígitos, 52XXXXXXXXXX (12), 521XXXXXXXXXX (13).
 */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10)                                  return `521${d}`;
  if (d.length === 12 && d.startsWith('52'))            return `521${d.slice(2)}`;
  if (d.length === 13 && d.startsWith('521'))           return d;
  // fallback: devolver dígitos limpios
  return d;
}
