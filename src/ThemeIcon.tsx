// A small mark for each theme a card can come from, so that a card's deck can be told at a glance.
// The same mark is used in every tool and in the Decks dialogs, which serve as the key.

type Mark = { label: string; colour: string; d: string; fill?: boolean; dots?: [number, number, number][] }

const THEMES: Record<string, Mark> = {
  core: { label: 'Core', colour: '#9aa3b2', d: 'M8 2.5l5.5 5.5L8 13.5 2.5 8z' },
  fantasy: { label: 'Fantasy', colour: '#e2b65a', fill: true, d: 'M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z' },
  scifi: { label: 'Science fiction', colour: '#6fb3d9', d: 'M11.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM3.6 9.9C2 10.8 1.2 11.6 1.5 12.1c.5.9 3.8.1 7.4-1.900s6.1-4.4 5.6-5.300c-.3-.5-1.4-.5-3 0' },
  horror: { label: 'Horror', colour: '#c0563f', d: 'M8 2a5 5 0 0 0-5 5c0 1.7.8 3 2 3.800V13h6v-2.200c1.2-.8 2-2.1 2-3.800a5 5 0 0 0-5-5zM6.5 13v-1.500M9.5 13v-1.5', dots: [[6, 7.3, 1.1], [10, 7.3, 1.1]] },
  animal: { label: 'Animal', colour: '#7fb87a', fill: true, d: 'M8 8.200c-2 0-3.6 1.7-3.6 3.3 0 1.1.9 1.7 1.9 1.7.7 0 1.1-.3 1.7-.3s1 .3 1.7.3c1 0 1.9-.6 1.9-1.7 0-1.6-1.6-3.3-3.6-3.300z', dots: [[3.4, 6.8, 1.3], [6.1, 4.2, 1.4], [9.9, 4.2, 1.4], [12.6, 6.8, 1.3]] },
  mystery: { label: 'Mystery', colour: '#8fa3c0', d: 'M10.5 6.500a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM9.5 9.500L14 14' },
  curios: { label: 'Curios', colour: '#c99a5a', d: 'M7.8 8a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0zM7.8 8H14M11.5 8v2.500M13.5 8v2' },
  dynamics: { label: 'Dynamics', colour: '#b0527a', d: 'M9.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM13.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z' },
  pasts: { label: 'Pasts', colour: '#8b5fa3', d: 'M4.5 2h7M4.5 14h7M5.2 2c0 3.3 5.6 3.5 5.6 6s-5.6 2.7-5.6 6M10.8 2c0 3.3-5.6 3.5-5.6 6s5.6 2.7 5.6 6' },
  frost: { label: 'Frost', colour: '#a9d3e6', d: 'M8 2v12M2.8 5l10.4 6M13.2 5L2.8 11' },
  coast: { label: 'Coast', colour: '#3fa39a', d: 'M1.5 6c2-2.5 4.5-2.5 6.5 0s4.5 2.5 6.5 0M1.5 11c2-2.5 4.5-2.5 6.5 0s4.5 2.5 6.5 0' },
  dry: { label: 'Desert', colour: '#d0a465', d: 'M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM8 1.500v2M8 12.500v2M1.5 8h2M12.5 8h2M3.4 3.400l1.4 1.400M11.2 11.200l1.4 1.400M12.6 3.400l-1.4 1.400M4.8 11.200l-1.4 1.4' },
  quests: { label: 'Quests', colour: '#5a6fc0', d: 'M4 14V2.500M4 3h8l-2 2.5 2 2.500H4' },
  customs: { label: 'Customs', colour: '#4a8f86', d: 'M2.5 3.500h11v7H8l-3 2.500v-2.500H2.500z' },
  lore: { label: 'Lore', colour: '#7a6a52', d: 'M8 4c-1.5-1-3.5-1-5.5-.5v9c2-.5 4-.5 5.5.5 1.5-1 3.5-1 5.5-.5v-9c-2-.5-4-.5-5.5.5zM8 4v9' },
  modern: { label: 'Modern', colour: '#9aa3b2', d: 'M3.5 14V3h6v11M9.5 7h3v7M2 14h12M5.5 5.500h2M5.5 8h2M5.5 10.500h2' },
  custom: { label: 'My cards', colour: '#e7e9ee', d: 'M3 13l1-3.500L10.5 3 13 5.5 6.5 12z' },
}
THEMES.starter = { ...THEMES.core, label: 'Starter' }

export const themeLabel = (deck: string) => THEMES[deck]?.label ?? deck

/** The mark of the deck a card came from. Unknown decks show nothing. */
/** `plain` is for use beside the deck's own name, where saying it again would only repeat it. */
export function ThemeIcon({ deck, size = 14, plain }: { deck?: string; size?: number; plain?: boolean }) {
  const t = deck ? THEMES[deck] : undefined
  if (!t) return null
  return (
    <svg className={`theme th-${deck}`} width={size} height={size} viewBox="0 0 16 16" style={{ color: t.colour }}
      {...(plain ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `${t.label} deck` })}>
      {!plain && <title>{t.label} deck</title>}
      <path d={t.d} fill={t.fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={t.fill ? 0.6 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
      {t.dots?.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="currentColor" />)}
    </svg>
  )
}
