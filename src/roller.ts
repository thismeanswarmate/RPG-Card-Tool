// What the table-rolling tools share. A table is a list of entries and its die is the number of them;
// which tables apply can depend on what earlier tables rolled.

export interface Table { id: string; label: string; entries: string[] }
export interface Step { title: string; blurb: string; tables: Table[] }
export type Rolls = Record<string, number | undefined>

export const entries = (raw: string) => raw.split('|').map((x) => x.trim()).filter(Boolean)

/** Roll every table that applies and is not locked. Later tables depend on earlier ones, so it goes round until none is left. */
export function rollTables(stepsFor: (rolls: Rolls) => Step[], rolls: Rolls, locked: string[] = [], random: () => number = Math.random): Rolls {
  const out: Rolls = { ...rolls }
  const done = new Set<string>()
  for (let guard = 0; guard < 80; guard++) {
    const next = stepsFor(out).flatMap((s) => s.tables).find((tb) => !done.has(tb.id))
    if (!next) break
    done.add(next.id)
    if (!locked.includes(next.id) || out[next.id] === undefined) out[next.id] = Math.floor(random() * next.entries.length)
  }
  return out
}

export const an = (w: string) => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`

/** Helpers for writing a brief: look up a rolled entry, and build a sentence that vanishes if any part is missing. */
export function reader(stepsFor: (rolls: Rolls) => Step[], rolls: Rolls) {
  const tables = Object.fromEntries(stepsFor(rolls).flatMap((s) => s.tables).map((tb) => [tb.id, tb]))
  const get = (id: string) => (rolls[id] === undefined ? undefined : tables[id]?.entries[rolls[id]!])
  const say = (strings: TemplateStringsArray, ...values: (string | undefined)[]) =>
    values.some((v) => v === undefined) ? '' : strings.reduce((s, part, i) => s + part + (values[i] ?? ''), '')
  return { get, say }
}
