import { useMemo, useRef } from 'react'
import { Emblem } from './Emblem'
import { useImages } from './imageStore'
import { buildMap, washFor } from './mapgen'
import { titleCase } from './names'
import type { Setting } from './setting'
import { emblemOf } from './settingBuild'

// The setting drawn as an ink map on parchment (or a blueprint, for science fiction).

const THEMES = {
  // `ocean` is the open sea, `sea` the paler shallows round the land, and `water` the lakes and rivers.
  parchment: { paper: '#e9dcc0', edge: '#8fa3a3', ink: '#3b2a1a', faint: '#8a7353', ocean: '#b6cbc9', sea: '#d5e3dd', water: '#9fc0c6', waterInk: '#35606e', beyond: '#d3cbb6', route: '#8c3b2a', halo: '#efe4cb' },
  blueprint: { paper: '#122a44', edge: '#060f1c', ink: '#d6e8ff', faint: '#7fa3cc', ocean: '#0a1a2e', sea: '#17395c', water: '#2b6a9c', waterInk: '#9fd0f0', beyond: '#1a2f47', route: '#ffd27a', halo: '#122a44' },
}

/** Half the width of a place's name as it is lettered on the map. */
const nameHalf = (name: string) => name.length * 5.3

const go = (id: string) => document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function SettingMap({ s }: { s: Setting }) {
  const links = useImages((x) => x.links)
  const tints = useImages((x) => x.tints)
  // Renaming changes the lettering but never the land, so the drawing is redone only when names change.
  const map = useMemo(() => buildMap(s), [s.id, s.seed, s.names, s.board, s.built, s.entities, s.people, s.beyond])
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
          <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
            <stop offset="60%" stopColor={t.edge} stopOpacity="0" />
            <stop offset="100%" stopColor={t.edge} stopOpacity=".85" />
          </radialGradient>
          {/* The land, for keeping a river's banks off the sea at its mouth; and all fresh water, for keeping its shallows inside it. */}
          <clipPath id="dry-land">{[...map.regions, ...map.beyond].map((r) => <path key={r.id} d={r.d} />)}</clipPath>
          <clipPath id="fresh-water">{map.rivers.map((r, i) => <path key={`r${i}`} d={r.shape} />)}{map.lakes.map((l, i) => <path key={`l${i}`} d={l.d} />)}</clipPath>
          {/* The land of the neighbouring worlds, for keeping the frontier line to where it belongs. */}
          <clipPath id="beyond-land">{map.beyond.map((b) => <path key={b.id} d={b.d} />)}</clipPath>
          {map.regions.map((r) => <clipPath key={r.id} id={`clip-${r.id}`}><circle cx={r.x} cy={r.y - 44} r="30" /></clipPath>)}
        </defs>

        {/* The ocean: one even colour to the edge of the sheet. */}
        <rect width={map.w} height={map.h} fill={t.ocean} />

        {/* Rings of shallow water around the land, then the coastline itself. */}
        <g fill="none" strokeLinejoin="round">
          {[[56, 0.3], [34, 0.4], [16, 0.55]].map(([width, opacity]) => (
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
          <path key={r.id} className="region" d={r.d} fill={tints[`${s.id}:${r.id}`] ? washFor(tints[`${s.id}:${r.id}`], map.theme) : r.colour} fillOpacity=".8" stroke={t.faint} strokeWidth=".9" strokeDasharray="5 4" onClick={() => go(r.id)}>
            <title>{r.name} — {r.terrain}</title>
          </path>
        ))}

        {/* Fresh water, drawn as the sea is: a dark shore, the sea's colour, and paler shallows along the banks.
            Every shore line goes down first and all the water over them, so that where a river meets a lake or
            the sea the water runs through with no line across it. */}
        <g pointerEvents="none" strokeLinejoin="round">
          {/* The sea's coast shows only a hairline of ink past the land laid over it; the shores of fresh water are drawn as fine. */}
          <g fill="none" stroke={t.ink}>
            <g strokeWidth="1.5" clipPath="url(#dry-land)">{map.rivers.map((r, i) => <path key={i} d={r.shape} />)}</g>
            <g strokeWidth="1.5">{map.lakes.map((l, i) => <path key={i} d={l.d} />)}</g>
          </g>
          <g fill={t.ocean}>
            {map.rivers.map((r, i) => <path key={`r${i}`} d={r.shape} />)}
            {map.lakes.map((l, i) => <path key={`l${i}`} d={l.d} />)}
          </g>
          <g fill="none" clipPath="url(#fresh-water)">
            {[[56, 0.3], [34, 0.4], [16, 0.55]].map(([width, opacity]) => (
              <g key={width} stroke={t.sea} strokeWidth={width} opacity={opacity}>
                {map.rivers.map((r, i) => <path key={`r${i}`} d={r.shape} />)}
                {map.lakes.map((l, i) => <path key={`l${i}`} d={l.d} />)}
              </g>
            ))}
          </g>
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
                  <text x={site.x} y={site.y + (site.rank === 'capital' ? 22 : site.rank === 'city' ? 19 : 16)} textAnchor="middle"
                    fontSize={site.rank === 'capital' ? 12.5 : site.rank === 'city' ? 11 : site.rank === 'village' || site.rank === 'post' ? 8.5 : 9.5}
                    fontWeight={site.rank === 'capital' || site.rank === 'city' ? 700 : 400} fontStyle={site.rank === 'capital' ? 'normal' : 'italic'}
                    letterSpacing={site.rank === 'capital' ? '.08em' : undefined}
                    fill={site.kind === 'peril' ? t.route : t.ink} stroke={t.halo} strokeWidth="3" paintOrder="stroke">{site.rank === 'capital' ? site.name.toUpperCase() : site.name}</text>
                </g>
              ))}
              {picture && (
                <g pointerEvents="none">
                  <image href={picture} x={r.x - 30} y={r.y - 74} width="60" height="60" preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${r.id})`} />
                  <circle cx={r.x} cy={r.y - 44} r="30" fill="none" stroke={t.ink} strokeWidth="2" />
                </g>
              )}
              {/* The land's emblem to the left of its name, and above the name the emblems of the cultures kept there. */}
              {(() => {
                const land = emblemOf(s, r.id)
                const kept = (s.drawn ?? []).filter((d) => d.tool === 'culture' && d.home === r.id).slice(0, 3)
                // The land's own emblem stands to the left of its name; the name moves over to keep the pair centred.
                const at = { x: r.x + (land ? 15 : 0) - nameHalf(r.name) - 30, y: r.y - 19, size: 24 }
                return (
                  <g className="map-emblems">
                    {land && <g onClick={() => go(r.id)}><Emblem spec={land} size={at.size} x={at.x} y={at.y} title={`Emblem of ${r.name}`} /></g>}
                    {kept.map((d, i) => {
                      const spec = emblemOf(s, d.id)
                      const cx = picture ? r.x - 35 - i * 17 : r.x - kept.length * 9 + i * 18 + 0.5
                      return spec && <g key={d.id} onClick={() => go(d.id)}><Emblem spec={spec} size={17} x={cx} y={picture ? r.y - 31 : r.y - 40} title={`Emblem of ${s.names[d.id]}, kept in ${r.name}`} /></g>
                    })}
                  </g>
                )
              })()}
              <g className="place-label" onClick={() => go(r.id)}>
                <text x={r.x + (emblemOf(s, r.id) ? 15 : 0)} y={r.y} textAnchor="middle" fontSize="17" fontWeight="700" letterSpacing=".06em" fill={t.ink} stroke={t.halo} strokeWidth="4.5" paintOrder="stroke">{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</text>
                <text x={r.x + (emblemOf(s, r.id) ? 15 : 0)} y={r.y + 13} textAnchor="middle" fontSize="8.5" letterSpacing=".16em" fill={t.ink} stroke={t.halo} strokeWidth="3" paintOrder="stroke">{r.terrain.toUpperCase()}</text>
              </g>
            </g>
          )
        })}

        {/* The names of lakes and rivers: a lake's beneath it, a river's set along its course. */}
        <g pointerEvents="none" fill={t.waterInk} fontStyle="italic" fontSize="8" stroke={t.halo} strokeWidth="2.6" paintOrder="stroke">
          <defs>{map.rivers.map((r, i) => <path key={i} id={`river-${i}`} d={r.along} />)}</defs>
          {map.rivers.map((r, i) => (
            <text key={i} dy="-7"><textPath href={`#river-${i}`} startOffset="50%" textAnchor="middle">{r.name}</textPath></text>
          ))}
          {map.lakes.map((l, i) => <text key={i} x={l.x} y={l.y} textAnchor="middle">{l.name}</text>)}
        </g>

        {/* The name of each neighbouring world, on its own land. */}
        <g pointerEvents="none">
          {map.beyond.map((b) => (
            <g key={b.id}>
              <text transform={`translate(${b.x} ${b.y}) rotate(${b.turn})`} textAnchor="middle" fontSize="15" fontStyle="italic" letterSpacing=".16em" fill={t.ink} opacity=".8" stroke={t.beyond} strokeWidth="4" paintOrder="stroke">
                {titleCase(b.name.replace(/^the /, 'The ')).toUpperCase()}
              </text>
            </g>
          ))}
        </g>

        {/* The seas, named along the open edges. */}
        <g pointerEvents="none" fill={t.waterInk} fontStyle="italic" letterSpacing=".14em">
          {map.seas.map((x) => (
            <text key={x.name} textAnchor="middle" fontSize="14" transform={`translate(${x.x} ${x.y}) rotate(${x.turn})`}>{titleCase(x.name.replace(/^the /, 'The '))}</text>
          ))}
        </g>

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
        <span className="hint">Dotted lines join places that a faction, a person or a story connects. A place with a picture is coloured from it. A neighbouring world is joined on by land and runs off its edge of the sheet, behind a dot-and-dash frontier; a side without one faces a named sea. Lakes and rivers are named too. Lakes and rivers are drawn as the sea is, and a river swells and narrows on its way to the lake or sea it joins. Each place carries its emblem to the left of its name, with the smaller emblems of the cultures kept there. A house marks a site and a cross a dangerous place. Settlements grow with their rank: a small circle for a village, a diamond for a trading post, a ringed dot for a town, battlements for a fortress town, a double ring for a city and a starred ring for the capital. Click any of them to read about it.</span>
        <button onClick={save}>Save map</button>
      </figcaption>
    </figure>
  )
}
