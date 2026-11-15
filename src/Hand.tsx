import { CardView } from './CardView'
import { titleOf } from './logic'
import { cardsOf, targetHub, useStore } from './store'
import { isHub } from './types'

export function Hand() {
  const s = useStore()
  const cards = cardsOf(s)
  if (!s.hand.length) return null
  const hub = targetHub(s)
  return (
    <div className="hand">
      <div className="hand-title">Click a cue to choose it. Keep {hub ? `tucks under ${titleOf(s.placed, cards, hub)}` : 'places the card on the table'}.</div>
      <div className="hand-cards">
        {s.hand.map((h) => {
          const def = cards[h.card]
          return (
            <div key={h.card} className="hand-card">
              <CardView def={def} active={h.active} onCue={(i) => s.setActive(h.card, i)} />
              <div className="hand-actions">
                <button className="primary" onClick={() => s.keep(h.card)}>Keep</button>
                {!isHub(def.type) && <button onClick={() => s.toMeta(h.card)}>Meta</button>}
                <button onClick={() => s.discard(h.card)}>Discard</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
