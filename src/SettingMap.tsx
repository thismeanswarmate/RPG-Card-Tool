import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Emblem } from './Emblem'
import { useImages } from './imageStore'
import { buildMap, washFor } from './mapgen'
import { rootOf } from './logic'
import { titleCase } from './names'
import { featureAt, type Setting } from './setting'
import { emblemOf } from './settingBuild'

// The setting drawn as an ink map on parchment (or a blueprint, for science fiction).

const THEMES = {
  // `ocean` is the open sea, `sea` the paler shallows round the land, and `water` the lakes and rivers.
  parchment: { paper: '#e9dcc0', edge: '#8fa3a3', ink: '#3b2a1a', faint: '#8a7353', ocean: '#b6cbc9', sea: '#d5e3dd', water: '#9fc0c6', waterInk: '#35606e', beyond: '#d3cbb6', route: '#8c3b2a', halo: '#efe4cb' },
  blueprint: { paper: '#122a44', edge: '#060f1c', ink: '#d6e8ff', faint: '#7fa3cc', ocean: '#0a1a2e', sea: '#17395c', water: '#2b6a9c', waterInk: '#9fd0f0', beyond: '#1a2f47', route: '#ffd27a', halo: '#122a44' },
}

/** Half the width of a place's name as it is lettered on the map. */
const nameHalf = (name: string) => name.length * 5.3

const scrollGo = (id: string) => document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/** Every layer of the map that the legend can turn on and off, in the order it is listed, each with a small sample of how it is drawn. */
type Theme = (typeof THEMES)['parchment']
const LAYERS: { group: string; items: [key: string, label: string, sample: (t: Theme) => ReactNode][] }[] = [
  { group: 'Land', items: [
    ['names', 'Land names', (t) => <text x="12" y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill={t.ink}>Aa</text>],
    ['terrain', 'Kind of land', (t) => <text x="12" y="11" textAnchor="middle" fontSize="6" letterSpacing=".1em" fill={t.ink}>MOOR</text>],
    ['wash', 'Land colours', () => <><rect x="3" y="3" width="9" height="10" fill="#b9c79a" /><rect x="12" y="3" width="9" height="10" fill="#d8b98c" /></>],
    ['borders', 'Borders', (t) => <path d="M3 8H21" stroke={t.faint} strokeWidth="1.4" strokeDasharray="4 3" />],
    ['emblems', 'Land emblems', (t) => <path d="M7 2H17V9Q17 13 12 15Q7 13 7 9Z" fill={t.route} stroke={t.ink} strokeWidth=".8" />],
    ['cultures', 'Culture emblems', (t) => <path d="M9 4H15V9Q15 11.500 12 13Q9 11.500 9 9Z" fill={t.water} stroke={t.ink} strokeWidth=".8" />],
    ['features', 'Features', (t) => <><path d="M12 3L15.500 8L12 13L8.5 8Z" fill={t.faint} stroke={t.ink} strokeWidth=".7" /></>],
    ['pictures', 'Pictures', (t) => <circle cx="12" cy="8" r="6" fill={t.faint} stroke={t.ink} strokeWidth="1.2" />],
  ] },
  { group: 'Water', items: [
    ['shallows', 'Shallows', (t) => <><rect x="2" y="2" width="20" height="12" fill={t.ocean} /><rect x="2" y="2" width="9" height="12" fill={t.sea} /></>],
    ['lakes', 'Lakes', (t) => <ellipse cx="12" cy="8" rx="8" ry="5" fill={t.sea} stroke={t.ink} strokeWidth=".8" />],
    ['rivers', 'Rivers', (t) => <><path d="M2 12Q8 2 13 8T22 4" fill="none" stroke={t.ink} strokeWidth="3.4" /><path d="M2 12Q8 2 13 8T22 4" fill="none" stroke={t.sea} strokeWidth="2" /></>],
    ['waterNames', 'Lake and river names', (t) => <text x="12" y="11" textAnchor="middle" fontSize="8" fontStyle="italic" fill={t.waterInk}>Mere</text>],
    ['seas', 'Sea names', (t) => <text x="12" y="11" textAnchor="middle" fontSize="8" fontStyle="italic" fill={t.waterInk}>Sea</text>],
  ] },
  { group: 'Settlements', items: [
    ['rank-capital', 'Capital', (t) => <g transform="translate(12 8) scale(.8)" stroke={t.ink}><circle r="9.5" fill={t.halo} strokeWidth="1.6" /><path d="M0-6.2L1.8-1.9L6.3-1.9L2.7.9L4 5.4L0 2.700L-4 5.4L-2.7.9L-6.3-1.9L-1.8-1.9Z" fill={t.route} strokeWidth=".6" /></g>],
    ['rank-city', 'Cities', (t) => <g transform="translate(12 8)" stroke={t.ink}><circle r="6.5" fill={t.halo} strokeWidth="1.4" /><circle r="4" fill="none" strokeWidth=".9" /><circle r="1.8" fill={t.ink} stroke="none" /></g>],
    ['rank-fort', 'Fortress towns', (t) => <path transform="translate(12 8)" d="M-5.5 5V-4.500h2.200v2h2.200v-2h2.200v2h2.200v-2h2.200V5Z" fill={t.halo} stroke={t.ink} strokeWidth="1.3" />],
    ['rank-town', 'Towns', (t) => <g transform="translate(12 8)" stroke={t.ink}><circle r="5" fill={t.halo} strokeWidth="1.4" /><circle r="2" fill={t.ink} stroke="none" /></g>],
    ['rank-post', 'Trading posts', (t) => <path transform="translate(12 8)" d="M0-4.500L4.5 0L0 4.500L-4.5 0Z" fill={t.halo} stroke={t.ink} strokeWidth="1.3" />],
    ['rank-village', 'Villages', (t) => <circle cx="12" cy="8" r="3" fill={t.halo} stroke={t.ink} strokeWidth="1.4" />],
  ] },
  { group: 'Marks', items: [
    ['sites', 'Sites', (t) => <path transform="translate(12 9)" d="M-5 4V-1L0-6L5-1V4Z" fill={t.ink} />],
    ['perils', 'Dangerous places', (t) => <path transform="translate(12 8)" d="M-5-5L5 5M5-5L-5 5" stroke={t.route} strokeWidth="2.2" strokeLinecap="round" />],
    ['people', 'People', (t) => <g transform="translate(12 8)" fill={t.halo} stroke={t.ink} strokeWidth="1"><circle cy="-2.5" r="2.6" /><path d="M-4.5 5.500Q0-2 4.5 5.500Z" /></g>],
    ['powers', 'Factions and things', (t) => <path transform="translate(12 8)" d="M-4-6V6M-4-6H5L2.5-2.800L5 .5H-4" fill={t.route} stroke={t.ink} strokeWidth="1" strokeLinejoin="round" />],
    ['siteNames', 'Names of sites and settlements', (t) => <text x="12" y="11" textAnchor="middle" fontSize="8" fontStyle="italic" fill={t.ink}>Inn</text>],
  ] },
  { group: 'Sheet', items: [
    ['beyond', 'Names of bordering worlds', (t) => <text x="12" y="11" textAnchor="middle" fontSize="6.5" fontStyle="italic" letterSpacing=".1em" fill={t.ink}>VALE</text>],
    ['frame', 'Title, compass and scale', (t) => <g transform="translate(12 8)" stroke={t.ink} fill={t.ink}><circle r="5" fill="none" strokeWidth=".6" /><path d="M0-7L1.500 0L0 7L-1.5 0Z" strokeWidth=".4" /></g>],
  ] },
]
const HIDDEN_KEY = 'storyloom-map-hidden'

/**
 * `onPick` is told which land is being looked at; `onOpen` is told what was clicked, to show its description; `selected` is the land shown as
 * picked; `tools` sit above the map; `compact` folds the legend away.
 */
export function SettingMap({ s, onPick, onOpen, selected, tools, compact }: { s: Setting; onPick?: (id: string) => void; onOpen?: (id: string) => void; selected?: string; tools?: ReactNode; compact?: boolean }) {
  // Clicking something on the map opens its description in a box; without one to open, the page goes to its entry.
  const go = onOpen ?? scrollGo
  // Looking closely at one land: the map draws in on it and shows everything it holds. With a panel beside the
  // map the land picked there is the one looked at; on the long page the map keeps its own.
  const [inner, setInner] = useState<string | null>(null)
  // Which layers are turned off. It is kept for this browser, and is the same for every setting.
  const [hidden, setHidden] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]') as string[]) } catch { return new Set() } })
  const keep = (next: Set<string>) => { setHidden(next); try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next])) } catch { /* private window */ } }
  const on = (key: string) => !hidden.has(key)
  const toggle = (key: string) => { const next = new Set(hidden); if (next.has(key)) next.delete(key); else next.add(key); keep(next) }
  const links = useImages((x) => x.links)
  const tints = useImages((x) => x.tints)
  // Renaming changes the lettering but never the land, so the drawing is redone only when names change.
  const map = useMemo(() => buildMap(s), [s.id, s.seed, s.names, s.board, s.built, s.entities, s.people, s.beyond])
  const t = THEMES[map.theme]
  const near = map.regions.find((r) => r.id === (onPick ? selected : inner))
  // How far in: the land and its features fill the sheet, within reason.
  const view = (() => {
    if (!near) return { k: 1, x: 0, y: 0 }
    const xs = [...near.points.map((p) => p[0]), ...near.features.map((f) => f.x)], ys = [...near.points.map((p) => p[1]), ...near.features.map((f) => f.y)]
    const [x0, y0, x1, y1] = [Math.min(...xs) - 46, Math.min(...ys) - 46, Math.max(...xs) + 46, Math.max(...ys) + 46]
    const k = Math.max(1.25, Math.min(map.w / (x1 - x0), map.h / (y1 - y0), 4.5))
    return { k, x: map.w / 2 - k * (x0 + x1) / 2, y: map.h / 2 - k * (y0 + y1) / 2 }
  })()
  // Lettering and marks grow less than the land does, so that a land seen closely has room for more of them.
  const z = view.k ** -0.45
  const about = (x: number, y: number) => (near ? `translate(${x} ${y}) scale(${z}) translate(${-x} ${-y})` : undefined)
  /** Clicking a land looks closely at it and nothing more; clicking its name or emblem once there opens its description. */
  const enter = (id: string) => { if (near?.id === id) return; if (onPick) onPick(id); else setInner(id) }
  const name = (id: string) => (near?.id === id ? go(id) : enter(id))
  const leave = () => { if (onPick) onPick('world'); else setInner(null) }
  // What else the land holds, shown on its clear ground when it is looked at closely.
  const within = (home?: string) => !!near && !!home && !!s.board[home] && rootOf(s.board, home) === near.id
  // Each stands on the ground of the feature it lies in, on the next clear spot there; with none left, on any.
  const tokens = (() => {
    if (!near) return []
    const free = [...near.spots]
    const all = [
      ...(on('powers') ? s.entities.filter((e) => within(e.home)).map((e) => ({ id: e.id, kind: e.kind === 'faction' ? 'faction' : 'thing' })) : []),
      ...(on('people') ? s.people.filter((c) => within(c.home)).map((c) => ({ id: c.id, kind: 'person' })) : []),
    ]
    return all.flatMap((k) => {
      const f = featureAt(s, k.id)
      const n = Math.max(0, free.findIndex((p) => !f || p.feature === f))
      const at = free.splice(n, 1)[0]
      return at ? [{ ...k, x: at.x, y: at.y }] : []
    })
  })()
  const lakes = on('lakes') ? map.lakes : [], rivers = on('rivers') ? map.rivers : []
  // On the world map only the great places show: the capital and the cities. The rest appear with their land.
  const shown = (site: (typeof map.regions)[number]['sites'][number], rid: string) => (rid === near?.id || site.rank === 'capital' || site.rank === 'city') && on(site.kind === 'settlement' ? `rank-${site.rank ?? 'town'}` : site.kind === 'peril' ? 'perils' : 'sites')
  const svg = useRef<SVGSVGElement>(null)
  const title = titleCase(s.names.world.charAt(0).toUpperCase() + s.names.world.slice(1))

  const save = () => {
    const copy = svg.current!.cloneNode(true) as SVGSVGElement
    copy.querySelectorAll('image').forEach((n) => n.parentNode?.removeChild(n))
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    copy.setAttribute('width', String(map.w))
    copy.setAttribute('height', String(map.h))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([copy.outerHTML], { type: 'image/svg+xml' }))
    a.download = `${s.names.world.replace(/^the /, '').replace(/\W+/g, '-').toLowerCase()}-map.svg`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const legend = (
      <div className="legend" role="group" aria-label="Map legend">
        <div className="legend-head">
          <strong>Legend</strong>
          <button onClick={() => keep(new Set())} disabled={!hidden.size}>Show all</button>
          <button onClick={() => keep(new Set(LAYERS.flatMap((g) => g.items.map(([key]) => key))))}>Hide all</button>
        </div>
        {LAYERS.map((g) => (
          <div key={g.group} className="legend-group">
            <span className="legend-title">{g.group}</span>
            {g.items.map(([key, label, sample]) => (
              <button key={key} className="legend-item" aria-pressed={on(key)} onClick={() => toggle(key)} title={on(key) ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
                <svg viewBox="0 0 24 16" width="24" height="16" aria-hidden="true" fontFamily="Georgia, serif">{sample(t)}</svg>
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>
  )
  return (
    <figure className="atlas">
      {tools}
      {!onPick && near && <div className="map-tools"><button onClick={leave}>← World map</button><span className="hint">Looking at {near.name}: click its name, or anything in it, to read about it.</span></div>}
      <svg ref={svg} viewBox={`0 0 ${map.w} ${map.h}`} role="img" aria-label={`Map of ${title}`} fontFamily="Georgia, 'Iowan Old Style', serif">
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
            <stop offset="60%" stopColor={t.edge} stopOpacity="0" />
            <stop offset="100%" stopColor={t.edge} stopOpacity=".85" />
          </radialGradient>
          {/* The land, for keeping a river's banks off the sea at its mouth; and all fresh water, for keeping its shallows inside it. */}
          {near && <clipPath id={`land-${near.id}`}><path d={near.d} /></clipPath>}
          <clipPath id="dry-land">{[...map.regions, ...map.beyond].map((r) => <path key={r.id} d={r.d} />)}</clipPath>
          <clipPath id="fresh-water">{rivers.map((r, i) => <path key={`r${i}`} d={r.shape} />)}{lakes.map((l, i) => <path key={`l${i}`} d={l.d} />)}</clipPath>
          {/* The land of the neighbouring worlds, for keeping the frontier line to where it belongs. */}
          <clipPath id="beyond-land">{map.beyond.map((b) => <path key={b.id} d={b.d} />)}</clipPath>
          {map.regions.map((r) => <clipPath key={r.id} id={`clip-${r.id}`}><circle cx={r.x} cy={r.y - 44} r="30" /></clipPath>)}
        </defs>

        {/* Everything on the land and sea moves together when the map draws in on a land; the title, compass and frame stay put. */}
        <g style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: '0 0', transition: 'transform .5s ease' }}>
        {/* The ocean: one even colour to the edge of the sheet. */}
        <rect width={map.w} height={map.h} fill={t.ocean} onClick={leave} />

        {/* Rings of shallow water around the land, then the coastline itself. */}
        <g fill="none" strokeLinejoin="round">
          {on('shallows') && [[56, 0.3], [34, 0.4], [16, 0.55]].map(([width, opacity]) => (
            <g key={width} stroke={t.sea} strokeWidth={width} opacity={opacity}>{[...map.regions, ...map.beyond].map((r) => <path key={r.id} d={r.d} />)}</g>
          ))}
          <g stroke={t.ink} strokeWidth="4.5">{[...map.regions, ...map.beyond].map((r) => <path key={r.id} d={r.d} />)}</g>
        </g>

        {/* Neighbouring worlds: plain land joined to this one and running off the sheet. */}
        {map.beyond.map((b) => <path key={b.id} d={b.d} fill={t.beyond} stroke={t.beyond} strokeWidth="3" strokeLinejoin="round" pointerEvents="none" />)}
        {/* The frontier: this world's outline in dots and dashes. Its inner half is covered by the land drawn next, and over
            the sea it falls on the coastline, so it shows only where a neighbouring world lies against it. */}
        {map.beyond.length > 0 && (
          <g fill="none" stroke={t.ink} strokeWidth="4" strokeDasharray="9 4 2 4" strokeLinejoin="round" pointerEvents="none" clipPath="url(#beyond-land)">
            {map.regions.map((r) => <path key={r.id} d={r.d} />)}
          </g>
        )}

        {/* The land: a wash for each region, with faint borders between them. */}
        {/* The paper under each wash is drawn a little proud of its outline, which closes any hairline between neighbours. */}
        {map.regions.map((r) => <path key={r.id} d={r.d} fill={t.paper} stroke={t.paper} strokeWidth="3" strokeLinejoin="round" />)}
        {map.regions.map((r) => (
          // A place with a picture takes its colour from the picture; the rest keep their terrain's.
          <path key={r.id} className="region" d={r.d} fill={!on('wash') ? t.paper : tints[`${s.id}:${r.id}`] ? washFor(tints[`${s.id}:${r.id}`], map.theme) : r.colour} fillOpacity=".8" stroke={r.id === near?.id ? t.ink : on('borders') ? t.faint : 'none'} strokeWidth={r.id === near?.id ? 2.6 * z : 0.9} strokeDasharray={r.id === near?.id ? undefined : '5 4'} onClick={() => enter(r.id)}>
            <title>{r.name} — {r.terrain}</title>
          </path>
        ))}

        {/* Fresh water, drawn as the sea is: a dark shore, the sea's colour, and paler shallows along the banks.
            Every shore line goes down first and all the water over them, so that where a river meets a lake or
            the sea the water runs through with no line across it. */}
        <g pointerEvents="none" strokeLinejoin="round">
          {/* The sea's coast shows only a hairline of ink past the land laid over it; the shores of fresh water are drawn as fine. */}
          <g fill="none" stroke={t.ink}>
            <g strokeWidth="1.5" clipPath="url(#dry-land)">{rivers.map((r, i) => <path key={i} d={r.shape} />)}</g>
            <g strokeWidth="1.5">{lakes.map((l, i) => <path key={i} d={l.d} />)}</g>
          </g>
          <g fill={t.ocean}>
            {rivers.map((r, i) => <path key={`r${i}`} d={r.shape} />)}
            {lakes.map((l, i) => <path key={`l${i}`} d={l.d} />)}
          </g>
          <g fill="none" clipPath="url(#fresh-water)">
            {on('shallows') && [[56, 0.3], [34, 0.4], [16, 0.55]].map(([width, opacity]) => (
              <g key={width} stroke={t.sea} strokeWidth={width} opacity={opacity}>
                {rivers.map((r, i) => <path key={`r${i}`} d={r.shape} />)}
                {lakes.map((l, i) => <path key={`l${i}`} d={l.d} />)}
              </g>
            ))}
          </g>
        </g>

        {map.regions.map((r) => {
          const picture = on('pictures') ? links[`${s.id}:${r.id}`] : undefined
          const shift = on('emblems') && emblemOf(s, r.id) ? 15 : 0
          return (
            <g key={r.id}>
              {r.sites.filter((site) => shown(site, r.id)).map((site) => (
                <g key={site.id} className="site" transform={about(site.x, site.y)} onClick={() => go(site.id)}>
                  {site.kind === 'settlement' ? (
                    // A settlement, drawn larger and grander the greater it is.
                    <g transform={`translate(${site.x} ${site.y})`} stroke={t.ink} strokeLinejoin="round">
                      {site.rank === 'capital' ? (
                        <>
                          <circle r="9.5" fill={t.halo} strokeWidth="1.6" />
                          <circle r="7" fill="none" strokeWidth=".8" />
                          <path d="M0-6.2L1.8-1.9L6.3-1.9L2.7.9L4 5.4L0 2.700L-4 5.4L-2.7.9L-6.3-1.9L-1.8-1.9Z" fill={t.route} strokeWidth=".6" />
                        </>
                      ) : site.rank === 'city' ? (
                        <>
                          <circle r="7" fill={t.halo} strokeWidth="1.5" />
                          <circle r="4.4" fill="none" strokeWidth="1" />
                          <circle r="2" fill={t.ink} stroke="none" />
                        </>
                      ) : site.rank === 'fort' ? (
                        <path d="M-5.5 5V-4.500h2.200v2h2.200v-2h2.200v2h2.200v-2h2.200V5Z" fill={t.halo} strokeWidth="1.4" />
                      ) : site.rank === 'post' ? (
                        <path d="M0-4.500L4.5 0L0 4.500L-4.5 0Z" fill={t.halo} strokeWidth="1.3" />
                      ) : site.rank === 'village' ? (
                        <circle r="3" fill={t.halo} strokeWidth="1.4" />
                      ) : (
                        <>
                          <circle r="5" fill={t.halo} strokeWidth="1.4" />
                          <circle r="2" fill={t.ink} stroke="none" />
                        </>
                      )}
                    </g>
                  ) : site.kind === 'peril' ? (
                    // A dangerous place: a cross in the colour of the routes.
                    <g transform={`translate(${site.x} ${site.y})`}>
                      <path d="M-5-5L5 5M5-5L-5 5" stroke={t.halo} strokeWidth="5" strokeLinecap="round" />
                      <path d="M-5-5L5 5M5-5L-5 5" stroke={t.route} strokeWidth="2.2" strokeLinecap="round" />
                    </g>
                  ) : (
                    <path d="M-5 4V-1L0-6L5-1V4Z" transform={`translate(${site.x} ${site.y})`} fill={t.ink} stroke={t.halo} strokeWidth="1" />
                  )}
                  {on('siteNames') && <text x={site.x} y={site.y + (site.rank === 'capital' ? 22 : site.rank === 'city' ? 19 : 16)} textAnchor="middle"
                    fontSize={site.rank === 'capital' ? 12.5 : site.rank === 'city' ? 11 : site.rank === 'village' || site.rank === 'post' ? 8.5 : 9.5}
                    fontWeight={site.rank === 'capital' || site.rank === 'city' ? 700 : 400} fontStyle={site.rank === 'capital' ? 'normal' : 'italic'}
                    letterSpacing={site.rank === 'capital' ? '.08em' : undefined}
                    fill={site.kind === 'peril' ? t.route : t.ink} stroke={t.halo} strokeWidth="3" paintOrder="stroke">{site.rank === 'capital' ? site.name.toUpperCase() : site.name}</text>}
                </g>
              ))}
              {picture && (
                <g pointerEvents="none" transform={about(r.x, r.y)}>
                  <image href={picture} x={r.x - 30} y={r.y - 74} width="60" height="60" preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${r.id})`} />
                  <circle cx={r.x} cy={r.y - 44} r="30" fill="none" stroke={t.ink} strokeWidth="2" />
                </g>
              )}
              {/* The land's emblem to the left of its name, and above the name the emblems of the cultures kept there. */}
              {(() => {
                const land = on('emblems') ? emblemOf(s, r.id) : undefined
                const kept = on('cultures') ? (s.drawn ?? []).filter((d) => d.tool === 'culture' && d.home === r.id).slice(0, 3) : []
                // The land's own emblem stands to the left of its name; the name moves over to keep the pair centred.
                const at = { x: r.x + (land ? 15 : 0) - nameHalf(r.name) - 30, y: r.y - 19, size: 24 }
                return (
                  <g className="map-emblems" transform={about(r.x, r.y)}>
                    {land && <g onClick={() => name(r.id)}><Emblem spec={land} size={at.size} x={at.x} y={at.y} title={`Emblem of ${r.name}`} /></g>}
                    {kept.map((d, i) => {
                      const spec = emblemOf(s, d.id)
                      const cx = picture ? r.x - 35 - i * 17 : r.x - kept.length * 9 + i * 18 + 0.5
                      return spec && <g key={d.id} onClick={() => go(d.id)}><Emblem spec={spec} size={17} x={cx} y={picture ? r.y - 31 : r.y - 40} title={`Emblem of ${s.names[d.id]}, kept in ${r.name}`} /></g>
                    })}
                  </g>
                )
              })()}
              <g className="place-label" transform={about(r.x, r.y)} onClick={() => name(r.id)}>
                {on('names') && <text x={r.x + shift} y={r.y} textAnchor="middle" fontSize="17" fontWeight="700" letterSpacing=".06em" fill={t.ink} stroke={t.halo} strokeWidth="4.5" paintOrder="stroke">{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</text>}
                {on('terrain') && <text x={r.x + shift} y={r.y + (on('names') ? 13 : 3)} textAnchor="middle" fontSize="8.5" letterSpacing=".16em" fill={t.ink} stroke={t.halo} strokeWidth="3" paintOrder="stroke">{r.terrain.toUpperCase()}</text>}
              </g>
            </g>
          )
        })}

        {/* Seen closely, a land shows what it is made up of, and everyone and everything in it. The ground of each
            feature is bounded by a fine line, as the lands are on the world map. */}
        {near && on('features') && (
          <g fill="none" stroke={t.ink} strokeWidth={1.1 * z} strokeDasharray={`${3 * z} ${3 * z}`} opacity=".55" pointerEvents="none" clipPath={`url(#land-${near.id})`}>
            {near.features.map((f) => f.d && <path key={f.id} d={f.d} />)}
          </g>
        )}
        {near && on('features') && near.features.map((f) => {
          const lake = map.lakes.find((l) => l.feature === f.id)
          const [x, y] = lake ? [lake.x, lake.y - 9] : [f.x, f.y]
          return (
            <g key={f.id} className="site" transform={about(x, y)} onClick={() => go(f.id)}>
              {!lake && <path d="M0-5L3.500 0L0 5L-3.5 0Z" transform={`translate(${x} ${y})`} fill={t.faint} stroke={t.ink} strokeWidth=".8" />}
              <text x={x} y={y + (lake ? 9 : 15)} textAnchor="middle" fontSize="10.5" fontStyle="italic" fontWeight="700" fill={t.ink} stroke={t.halo} strokeWidth="3" paintOrder="stroke">{f.name}</text>
              <text x={x} y={y + (lake ? 18 : 24)} textAnchor="middle" fontSize="6.5" letterSpacing=".14em" fill={t.ink} stroke={t.halo} strokeWidth="2.4" paintOrder="stroke">{f.what.toUpperCase()}</text>
            </g>
          )
        })}
        {near && tokens.map((k) => {
          const { x, y } = k
          return (
            <g key={k.id} className="site" transform={about(x, y)} onClick={() => go(k.id)}>
              <g transform={`translate(${x} ${y})`} stroke={t.ink} strokeWidth="1" strokeLinejoin="round">
                {k.kind === 'person' ? <g fill={t.halo}><circle cy="-2.500" r="2.600" /><path d="M-4.500 5.500Q0-2 4.500 5.500Z" /></g>
                  : k.kind === 'faction' ? <path d="M-4-6V6M-4-6H5L2.500-2.800L5 .5H-4" fill={t.route} />
                    : <path d="M0-4.500L4 0L0 4.500L-4 0Z" fill={t.water} />}
              </g>
              <text x={x} y={y + 14} textAnchor="middle" fontSize="8.5" fill={t.ink} stroke={t.halo} strokeWidth="2.6" paintOrder="stroke">{s.names[k.id]}</text>
            </g>
          )
        })}

        {/* The names of lakes and rivers: a lake's beneath it, a river's set along its course. */}
        <g pointerEvents="none" fill={t.waterInk} fontStyle="italic" fontSize={8 * z} stroke={t.halo} strokeWidth={2.6 * z} paintOrder="stroke">
          <defs>{map.rivers.map((r, i) => <path key={i} id={`river-${i}`} d={r.along} />)}</defs>
          {on('waterNames') && near && rivers.map((r, i) => (
            <text key={i} dy={-7 * z}><textPath href={`#river-${i}`} startOffset="50%" textAnchor="middle">{r.name}</textPath></text>
          ))}
          {on('waterNames') && near && lakes.map((l, i) => !l.feature && <text key={i} x={l.x} y={l.y} textAnchor="middle">{l.name}</text>)}
        </g>

        {/* The name of each neighbouring world, on its own land. */}
        <g pointerEvents="none">
          {on('beyond') && map.beyond.map((b) => (
            <g key={b.id}>
              <text transform={`translate(${b.x} ${b.y}) rotate(${b.turn})`} textAnchor="middle" fontSize="15" fontStyle="italic" letterSpacing=".16em" fill={t.ink} opacity=".8" stroke={t.beyond} strokeWidth="4" paintOrder="stroke">
                {titleCase(b.name.replace(/^the /, 'The ')).toUpperCase()}
              </text>
            </g>
          ))}
        </g>

        {/* The seas, named along the open edges. */}
        <g pointerEvents="none" fill={t.waterInk} fontStyle="italic" letterSpacing=".14em">
          {on('seas') && map.seas.map((x) => (
            <text key={x.name} textAnchor="middle" fontSize="14" transform={`translate(${x.x} ${x.y}) rotate(${x.turn})`}>{titleCase(x.name.replace(/^the /, 'The '))}</text>
          ))}
        </g>

        </g>

        {/* Title, compass and scale. */}
        {on('frame') && <g pointerEvents="none">
          <rect x="22" y="22" width={Math.max(190, title.length * 12 + 44)} height="46" fill={t.paper} stroke={t.ink} strokeWidth="1.5" />
          <rect x="26" y="26" width={Math.max(190, title.length * 12 + 44) - 8} height="38" fill="none" stroke={t.ink} strokeWidth=".7" />
          <text x={22 + Math.max(190, title.length * 12 + 44) / 2} y="52" textAnchor="middle" fontSize="19" fontWeight="700" letterSpacing=".08em" fill={t.ink}>{title}</text>

          <g transform={`translate(${map.w - 70} 74)`} stroke={t.ink} fill={t.ink}>
            <circle r="26" fill="none" strokeWidth=".8" />
            <path d="M0-34L6 0L0 34L-6 0Z" strokeWidth=".8" fillOpacity=".85" />
            <path d="M-34 0L0-6L34 0L0 6Z" strokeWidth=".8" fill={t.paper} />
            <text y="-39" textAnchor="middle" fontSize="13" fontWeight="700" stroke="none">N</text>
          </g>

          <g transform={`translate(34 ${map.h - 38})`} stroke={t.ink} fill={t.ink}>
            <path d={`M0 0H${map.scale.px}M0-5V5M${map.scale.px / 2}-3V3M${map.scale.px}-5V5`} fill="none" strokeWidth="1.4" />
            <text x={map.scale.px + 10} y="4" fontSize="11" fontStyle="italic" stroke="none">{map.scale.label}</text>
          </g>
        </g>}

        <rect width={map.w} height={map.h} fill="url(#vignette)" pointerEvents="none" />
        <rect x="8" y="8" width={map.w - 16} height={map.h - 16} fill="none" stroke={t.ink} strokeWidth="2.5" pointerEvents="none" />
        <rect x="14" y="14" width={map.w - 28} height={map.h - 28} fill="none" stroke={t.ink} strokeWidth=".8" pointerEvents="none" />
      </svg>
      <figcaption>
        <span className="hint">Click a land to look closely at it, then its name or anything in it to read about it. A neighbouring world lies behind a dot-and-dash frontier. Turn any part of the map on or off in the legend; Save map saves it as it is shown.</span>
        <button onClick={save}>Save map</button>
      </figcaption>
      {compact ? <details className="legend-fold"><summary>Legend: turn parts of the map on and off</summary>{legend}</details> : legend}
    </figure>
  )
}
