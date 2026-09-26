/**
 * Text in a vivid colour (a rank tier, a volume status): kept as-is on dark
 * themes, mixed toward the text colour on light ones so pale colours like
 * Silver or Gold stay readable. `--ink` is set per theme (features/settings/themes.ts).
 */
export function ink(color: string): string {
  return `color-mix(in oklab, ${color} var(--ink, 100%), hsl(var(--foreground)))`
}
