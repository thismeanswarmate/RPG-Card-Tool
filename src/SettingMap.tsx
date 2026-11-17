import { useMemo, useRef } from 'react'
import { Emblem } from './Emblem'
import { useImages } from './imageStore'
import { buildMap, washFor, type Glyph } from './mapgen'
import { titleCase } from './names'
import type { Setting } from './setting'
import { emblemOf } from './settingBuild'

// The setting drawn as an ink map on parchment (or a blueprint, for science fiction).

const GLYPH: Record<Glyph, string> = {
  tree: 'M0 7V2M-5 2Q-6.5-5 0-7Q6.5-5 5 2Z',
  deadtree: 'M0 7V-2M0 1L-5-5M0-2L5-7M-2.5-2L-6-2M2.5-4.5L6-3',
  peak: 'M-9 5L-2-7L2 0L4.5-3L9 5M-2-7L0 5M-1-2L-4 5',
  tuft: 'M-4 4Q-4-1-6-3M0 4V-4M4 4Q4-1 6-3',
  reed: 'M-6 4H6M-3 4V-4M0 4V-6M3 4V-3M-8 7H-3M2 7H7',
  snow: 'M0-6V6M-5-3L5 3M-5 3L5-3',
  wave: 'M-8 0Q-4-5 0 0T8 0M-5 5Q-2 2 1 5T7 5',
  crater: 'M-4.5 0A4.5 3 0 1 0 4.5 0A4.5 3 0 1 0-4.5 0M-2 1A2.5 1.5 0 0 0 2.5 0',
  cross: 'M0-6V6M-4-2H4',
  crystal: 'M0-7L4-1L0 7L-4-1ZM-4-1H4M0-7V7',
  dune: 'M-9 3Q-3-6 3 3M0 3Q5-3 9 3',
  dome: 'M-6 4A6 6 0 0 1 6 4ZM-8 4H8M0-2V4',
}

const THEMES = {
  parchment: { paper: '#e9dcc0', edge: '#c9b78f', ink: '#3b2a1a', faint: '#8a7353', sea: '#b9c2b0', route: '#8c3b2a', halo: '#efe4cb' },
  blueprint: { paper: '#122a44', edge: '#0b1c30', ink: '#d6e8ff', faint: '#7fa3cc', sea: '#1d4266', route: '#ffd27a', halo: '#122a44' },
}

const go = (id: string) => document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function SettingMap({ s }: { s: Setting }) {
  const links = useImages((x) => x.links)
  const tints = useImages((x) => x.tints)
  // Renaming changes the lettering but never the land, so the drawing is redone only when names change.
  const map = useMemo(() => buildMap(s), [s.id, s.seed, s.names])
  const t = THEMES[map.theme]
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

  return (
    <figure className="atlas">
      <svg ref={svg} viewBox={`0 0 ${map.w} ${map.h}`} role="img" aria-label={`Map of ${title}`} fontFamily="Georgia, 'Iowan Old Style', serif">
        <defs>
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.16" />
          </filter>
          <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
            <stop offset="60%" stopColor={t.edge} stopOpacity="0" />
            <stop offset="100%" stopColor={t.edge} stopOpacity=".85" />
          </radialGradient>
          {Object.entries(GLYPH).map(([k, d]) => (
            <path key={k} id={`gl-${k}`} d={d} fill="none" stroke={t.ink} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {map.regions.map((r) => <clipPath key={r.id} id={`clip-${r.id}`}><circle cx={r.x} cy={r.y - 44} r="30" /></clipPath>)}
        </defs>

        <rect width={map.w} height={map.h} fill={t.paper} />
        <rect width={map.w} height={map.h} fill={t.ink} filter="url(#grain)" opacity=".38" />

        {/* The sea: rings of shallow water around the land, then the coastline itself. */}
        <g fill="none" strokeLinejoin="round">
          {[[52, 0.22], [32, 0.26], [16, 0.32]].map(([width, opacity]) => (
            <g key={width} stroke={t.sea} strokeWidth={width} opacity={opacity}>{map.regions.map((r) => <path key={r.id} d={r.d} />)}</g>
          ))}
          <g stroke={t.ink} strokeWidth="4.5">{map.regions.map((r) => <path key={r.id} d={r.d} />)}</g>
        </g>

        {/* The land: a wash for each region, with faint borders between them. */}
        {map.regions.map((r) => <path key={r.id} d={r.d} fill={t.paper} />)}
        {map.regions.map((r) => (
          // A place with a picture takes its colour from the picture; the rest keep their terrain's.
          <path key={r.id} className="region" d={r.d} fill={tints[`${s.id}:${r.id}`] ? washFor(tints[`${s.id}:${r.id}`], map.theme) : r.colour} fillOpacity=".8" stroke={t.faint} strokeWidth=".9" strokeDasharray="5 4" onClick={() => go(r.id)}>
            <title>{r.name} — {r.terrain}</title>
          </path>
        ))}

        <g pointerEvents="none" opacity=".8">
          {map.regions.flatMap((r) => r.symbols.map((p, i) => (
            <use key={`${r.id}-${i}`} href={`#gl-${r.glyph}`} transform={`translate(${p.x} ${p.y}) scale(${p.k})`} />
          )))}
        </g>

        <g fill="none" stroke={t.route} strokeWidth="1.5" strokeDasharray="1.5 6" strokeLinecap="round" opacity=".7" pointerEvents="none">
          {map.routes.map((r) => <path key={`${r.a}-${r.b}`} d={r.d} />)}
        </g>

        {map.regions.map((r) => {
          const picture = links[`${s.id}:${r.id}`]
          return (
            <g key={r.id}>
              {r.sites.map((site) => (
                <g key={site.id} className="site" onClick={() => go(site.id)}>
                  {site.kind === 'settlement' ? (
                    // A settlement: the ringed dot of old maps.
                    <g transform={`translate(${site.x} ${site.y})`}>
                      <circle r="5.5" fill={t.halo} stroke={t.ink} strokeWidth="1.4" />
                      <circle r="2.2" fill={t.ink} />
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
                  <text x={site.x} y={site.y + 16} textAnchor="middle" fontSize="9.5" fontStyle="italic" fill={site.kind === 'peril' ? t.route : t.ink} stroke={t.halo} strokeWidth="3" paintOrder="stroke">{site.name}</text>
                </g>
              ))}
              {picture && (
                <g pointerEvents="none">
                  <image href={picture} x={r.x - 30} y={r.y - 74} width="60" height="60" preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${r.id})`} />
                  <circle cx={r.x} cy={r.y - 44} r="30" fill="none" stroke={t.ink} strokeWidth="2" />
                </g>
              )}
              {/* The land's emblem above its name, or at the corner of its picture, with the emblems of the cultures kept there beside it. */}
              {(() => {
                const land = emblemOf(s, r.id)
                const kept = (s.drawn ?? []).filter((d) => d.tool === 'culture' && d.home === r.id).slice(0, 3)
                const at = picture ? { x: r.x + 17, y: r.y - 36, size: 24 } : { x: r.x - 13 - kept.length * 8, y: r.y - 47, size: 26 }
                return (
                  <g className="map-emblems">
                    {land && <g onClick={() => go(r.id)}><Emblem spec={land} size={at.size} x={at.x} y={at.y} title={`Emblem of ${r.name}`} /></g>}
                    {kept.map((d, i) => {
                      const spec = emblemOf(s, d.id)
                      const cx = picture ? r.x - 35 - i * 17 : at.x + at.size + 3 + i * 18
                      return spec && <g key={d.id} onClick={() => go(d.id)}><Emblem spec={spec} size={17} x={cx} y={picture ? r.y - 31 : r.y - 41} title={`Emblem of ${s.names[d.id]}, kept in ${r.name}`} /></g>
                    })}
                  </g>
                )
              })()}
              <g className="place-label" onClick={() => go(r.id)}>
                <text x={r.x} y={r.y} textAnchor="middle" fontSize="17" fontWeight="700" letterSpacing=".06em" fill={t.ink} stroke={t.halo} strokeWidth="4.5" paintOrder="stroke">{r.name}</text>
                <text x={r.x} y={r.y + 13} textAnchor="middle" fontSize="8.5" letterSpacing=".16em" fill={t.ink} stroke={t.halo} strokeWidth="3" paintOrder="stroke">{r.terrain.toUpperCase()}</text>
              </g>
            </g>
          )
        })}

        {/* Title, compass and scale. */}
        <g pointerEvents="none">
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
        </g>

        <rect width={map.w} height={map.h} fill="url(#vignette)" pointerEvents="none" />
        <rect x="8" y="8" width={map.w - 16} height={map.h - 16} fill="none" stroke={t.ink} strokeWidth="2.5" pointerEvents="none" />
        <rect x="14" y="14" width={map.w - 28} height={map.h - 28} fill="none" stroke={t.ink} strokeWidth=".8" pointerEvents="none" />
      </svg>
      <figcaption>
        <span className="hint">Dotted lines join places that a faction, a person or a story connects. A place with a picture is coloured from it. Each place carries its emblem, with the smaller emblems of the cultures kept there. A house marks a site, a ringed dot a settlement and a cross a dangerous place. Click any of them to read about it.</span>
        <button onClick={save}>Save map</button>
      </figcaption>
    </figure>
  )
}
