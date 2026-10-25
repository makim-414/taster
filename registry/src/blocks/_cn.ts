// Tiny className joiner (a clsx stand-in with no dependency). Used by every block.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
