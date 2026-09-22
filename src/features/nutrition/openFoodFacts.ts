/**
 * Barcode → nutrition lookup via Open Food Facts (free, no API key).
 *
 * OFF is crowd-sourced: values can be missing or mistyped, so results are
 * always shown for review before they're saved (see ScannedFoodReview).
 */

const KJ_PER_KCAL = 4.184
const FIELDS = [
  'product_name', 'product_name_en', 'generic_name', 'generic_name_en', 'brands', 'quantity',
  'serving_size', 'serving_quantity', 'serving_quantity_unit', 'nutrition_data_per', 'nutriments',
].join(',')

export type NutrientKey = 'kcal' | 'protein' | 'carbs' | 'fat'

/** What the scanner found. Nutrient values are for `amount` `unit` (one package serving, or 100). */
export interface ScannedFood {
  barcode: string
  name: string
  amount: number
  unit: 'g' | 'ml'
  /** Human label from the package, e.g. "1 can (354.9 mL)". */
  servingLabel?: string
  /** null = not in the database; the user must fill it in from the label. */
  values: Record<NutrientKey, number | null>
  source: 'database' | 'saved'
}

type Nutriments = Record<string, unknown>
type Product = Record<string, unknown>

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** kcal for a basis ("100g" or "serving"), converting from kJ when only that is recorded. */
function kcalFor(n: Nutriments, basis: '100g' | 'serving'): number | null {
  const kcal = num(n[`energy-kcal_${basis}`])
  if (kcal != null) return kcal
  const kj = num(n[`energy-kj_${basis}`]) ?? num(n[`energy_${basis}`]) // plain "energy" is kJ in OFF
  return kj != null ? kj / KJ_PER_KCAL : null
}

function valuesFor(n: Nutriments, basis: '100g' | 'serving'): Record<NutrientKey, number | null> {
  return {
    kcal: kcalFor(n, basis),
    protein: num(n[`proteins_${basis}`]),
    carbs: num(n[`carbohydrates_${basis}`]),
    fat: num(n[`fat_${basis}`]),
  }
}

function detectUnit(p: Product): 'g' | 'ml' {
  const servingUnit = str(p.serving_quantity_unit)?.toLowerCase()
  if (servingUnit === 'ml') return 'ml'
  if (servingUnit === 'g') return 'g'
  if (str(p.nutrition_data_per) === '100ml') return 'ml'
  return /\b(ml|cl|dl|l|fl\.? ?oz)\b/i.test(str(p.quantity) ?? '') ? 'ml' : 'g'
}

function displayName(p: Product): string {
  const name = str(p.product_name_en) ?? str(p.product_name) ?? str(p.generic_name_en) ?? str(p.generic_name) ?? 'Unknown product'
  const brands = (str(p.brands) ?? '').split(',').map(b => b.trim()).filter(Boolean)
  // Prefix the brand unless the name already mentions one ("Nutella", "Coca-Cola").
  const mentioned = brands.some(b => name.toLowerCase().includes(b.toLowerCase()))
  return brands[0] && !mentioned ? `${brands[0]} ${name}` : name
}

/** Turn an OFF product into per-serving values when the package serving is known, else per 100 g/ml. */
export function parseProduct(barcode: string, p: Product): ScannedFood {
  const n = (p.nutriments ?? {}) as Nutriments
  const unit = detectUnit(p)
  const per100 = valuesFor(n, '100g')
  const perServing = valuesFor(n, 'serving')
  const servingQty = num(p.serving_quantity)

  const base = { barcode, name: displayName(p), unit, source: 'database' as const }

  if (servingQty && servingQty > 0) {
    // Prefer the label's own per-serving numbers, else scale the per-100 values.
    const scale = servingQty / 100
    const values = Object.fromEntries(
      (Object.keys(per100) as NutrientKey[]).map(k => {
        const v = perServing[k] ?? (per100[k] != null ? per100[k]! * scale : null)
        return [k, v == null ? null : k === 'kcal' ? Math.round(v) : round1(v)]
      }),
    ) as Record<NutrientKey, number | null>
    return { ...base, amount: round1(servingQty), servingLabel: str(p.serving_size), values }
  }

  const values = Object.fromEntries(
    (Object.keys(per100) as NutrientKey[]).map(k => [k, per100[k] == null ? null : k === 'kcal' ? Math.round(per100[k]!) : round1(per100[k]!)]),
  ) as Record<NutrientKey, number | null>
  return { ...base, amount: 100, values }
}

/** Returns null when the product isn't in the database. Throws on network errors. */
export async function lookupBarcode(barcode: string): Promise<ScannedFood | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${FIELDS}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Food Facts responded ${res.status}`)
  const json = (await res.json()) as { status?: number; product?: Product }
  if (json.status !== 1 || !json.product) return null
  return parseProduct(barcode, json.product)
}

/** GS1 check digit test (EAN-13, EAN-8, UPC-A). */
function hasValidCheckDigit(code: string): boolean {
  const digits = code.split('').map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

/** Expand an 8-digit UPC-E (small US packages) to its 12-digit UPC-A form, or null if it isn't one. */
export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null
  const [ns, d1, d2, d3, d4, d5, d6, check] = code.split('')
  let body: string
  if ('012'.includes(d6)) body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`
  else if (d6 === '3') body = `${d1}${d2}${d3}00000${d4}${d5}`
  else if (d6 === '4') body = `${d1}${d2}${d3}${d4}00000${d5}`
  else body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`
  const upcA = `${ns}${body}${check}`
  return hasValidCheckDigit(upcA) ? upcA : null
}

/**
 * The code to look up, or null if it isn't a valid retail barcode (catches
 * misreads and typos). `upcE` = the scanner reported the short UPC-E format.
 */
export function normalizeBarcode(raw: string, upcE = false): string | null {
  const code = raw.replace(/\D/g, '')
  if (upcE || (code.length === 8 && !hasValidCheckDigit(code))) return expandUpcE(code)
  if (/^(\d{8}|\d{12}|\d{13})$/.test(code) && hasValidCheckDigit(code)) return code
  return null
}

/** Human-readable problems with a set of values (missing fields, calories that don't add up). */
export function nutritionWarnings(values: Record<NutrientKey, number | null>, amount: number): string[] {
  const warnings: string[] = []
  const labels: Record<NutrientKey, string> = { kcal: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' }
  const missing = (Object.keys(labels) as NutrientKey[]).filter(k => values[k] == null)
  if (missing.length) warnings.push(`${missing.map(k => labels[k]).join(', ')} missing from the database — copy from the label.`)

  const { kcal, protein, carbs, fat } = values
  if (kcal != null && protein != null && carbs != null && fat != null) {
    const fromMacros = protein * 4 + carbs * 4 + fat * 9
    if (fromMacros > 20 && kcal > fromMacros * 3.5) {
      warnings.push('Calories look like kilojoules (about 4× too high). Divide by 4.184 or check the label.')
    } else if (fromMacros > 20 && (kcal > fromMacros * 1.35 + 15 || kcal < fromMacros * 0.65 - 15)) {
      warnings.push(`Calories don't match the macros (macros suggest ~${Math.round(fromMacros)} kcal). Check the label.`)
    }
    if (amount > 0 && protein + carbs + fat > amount * 1.02) {
      warnings.push(`Protein + carbs + fat add up to more than ${amount} g — a value is probably wrong.`)
    }
  }
  return warnings
}
