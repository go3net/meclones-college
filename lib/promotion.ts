/**
 * Map a class's current grade-level name to the next one. Returns null for
 * the terminal class (SS 3) so callers know to graduate the student rather
 * than promote.
 *
 * Lives outside any `"use server"` file so it can be imported synchronously
 * by both server actions and server components.
 */
export function nextLevelName(current: string): string | null {
  const t = current.trim().toUpperCase().replace(/\s+/g, " ");
  const map: Record<string, string | null> = {
    "JSS 1": "JSS 2",
    "JSS 2": "JSS 3",
    "JSS 3": "SS 1",
    "SS 1": "SS 2",
    "SS 2": "SS 3",
    "SS 3": null, // graduates
  };
  return map[t] ?? null;
}
