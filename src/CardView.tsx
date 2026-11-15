import { cueAt } from './logic'
import { TERRAIN_COLORS } from './starter'
import { TYPE_INFO, type CardDef, type Edge } from './types'

const EDGE = ['top', 'right', 'bottom', 'left']

function terrainStyle(def: CardDef) {
  const name = def.cues[0].text
  let pair = TERRAIN_COLORS[name]
  if (!pair) {
    let h = 0
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
    pair = [`hsl(${h} 35% 45%)`, `hsl(${(h + 40) % 360} 35% 28%)`]
  }
  return { background: `linear-gradient(140deg, ${pair[0]}, ${pair[1]})` }
}

interface Props {
  def: CardDef
  active: number
  /** Edge of the parent this card is tucked under, if any. */
  edge?: Edge
  selected?: boolean
  onCue?: (i: number) => void
}

export function CardView({ def, active, edge, selected, onCue }: Props) {
  const cls = `card ${def.type}${selected ? ' selected' : ''}`
  const info = TYPE_INFO[def.type]
  const pick = (i: number) => onCue && ((e: React.MouseEvent) => { e.stopPropagation(); onCue(i) })

  if (def.cues.length === 1)
    return (
      <div className={cls} style={terrainStyle(def)}>
        <span className="terrain-name">{def.cues[0].text}</span>
      </div>
    )

  if (def.cues.length === 2) {
    const other = 1 - active
    const order = edge === 1 || edge === 2 ? [other, active] : [active, other]
    const side = edge === 1 || edge === 3
    return (
      <div className={`${cls} halves ${side ? 'side' : ''}`}>
        {order.map((i, n) => (
          <div key={i} className={`half ${i === active ? 'on' : ''} ${side ? (n ? 'right' : 'left') : ''}`} onClick={pick(i)}>
            <span>
              <b>{def.cues[i].text}</b>
              {def.cues[i].sub && <i>{def.cues[i].sub}</i>}
            </span>
          </div>
        ))}
        {edge === undefined && <em className="glyph">{info.glyph}</em>}
      </div>
    )
  }

  if (edge !== undefined)
    return (
      <div className={cls}>
        <div className={`band strip ${EDGE[edge]} on`}><span>{def.cues[active].text}</span></div>
      </div>
    )

  return (
    <div className={cls}>
      {[0, 1, 2, 3].map((s) => {
        const i = cueAt(active, undefined, s)
        return (
          <div key={s} className={`band ${EDGE[s]} ${i === active ? 'on' : ''}`} onClick={pick(i)}>
            <span>{def.cues[i].text}</span>
          </div>
        )
      })}
      <em className="glyph">{info.glyph}</em>
    </div>
  )
}
