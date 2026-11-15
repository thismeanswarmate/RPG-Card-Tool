import { useState } from 'react'
import { cardsOf, extraTypes, useStore } from './store'
import { BASE_TYPES, TYPE_INFO, TYPES, type Held } from './types'

function Mini({ held, children }: { held: Held; children: React.ReactNode }) {
  const s = useStore()
  const def = cardsOf(s)[held.card]
  return (
    <div className={`mini ${def.type}`}>
      <div className="mini-cues">
        {def.cues.map((c, i) => (
          <button key={i} className={i === held.active ? 'on' : ''} onClick={() => s.setActive(held.card, i)}>{c.text}</button>
        ))}
      </div>
      <div className="mini-actions">{children}</div>
    </div>
  )
}

export function Sidebar() {
  const s = useStore()
  const cards = cardsOf(s)
  const [showDiscards, setShowDiscards] = useState(false)
  const metaTypes = s.meta.map((m) => cards[m.card].type)
  const crowded = metaTypes.some((t, i) => metaTypes.indexOf(t) !== i)

  return (
    <aside className="sidebar">
      <h3>Draw piles</h3>
      {[...BASE_TYPES, ...extraTypes(s)].map((t) => (
        <div key={t} className={`pile ${t}`}>
          <span className="chip">{TYPE_INFO[t].glyph}</span>
          <span className="pile-name" title={TYPE_INFO[t].blurb}>{TYPE_INFO[t].label}</span>
          <span className="count">{s.piles[t].length}</span>
          <button onClick={() => s.draw(t)} disabled={!s.piles[t].length && !s.discards.some((d) => cards[d]?.type === t)}>Draw</button>
        </div>
      ))}

      <h3>
        Sideboard
        <button className="link" onClick={s.toggleSide}>{s.side ? 'Put away' : 'Set out'}</button>
      </h3>
      {s.side ? (
        TYPES.map((t) => {
          const id = s.side![t]
          return id ? (
            <div key={t} className={`mini ${t}`}>
              <div className="mini-cues">{cards[id].cues.map((c, i) => <span key={i}>{c.text}</span>)}</div>
              <div className="mini-actions"><button onClick={() => s.takeSide(t)}>Take</button></div>
            </div>
          ) : null
        })
      ) : (
        <p className="hint">Six face-up cards you can take instead of a blind draw.</p>
      )}

      <h3>World meta</h3>
      {s.meta.length ? (
        s.meta.map((m) => (
          <Mini key={m.card} held={m}>
            <button onClick={() => s.toHand(m.card)}>To hand</button>
            <button onClick={() => s.discard(m.card)}>Discard</button>
          </Mini>
        ))
      ) : (
        <p className="hint">Cues that apply to the whole world. Send a card here from your hand or the table.</p>
      )}
      {crowded && <p className="hint warn">Tip: one meta card per type keeps a world focused.</p>}

      <h3>
        Discards <span className="count">{s.discards.length}</span>
        {s.discards.length > 0 && <button className="link" onClick={() => setShowDiscards(!showDiscards)}>{showDiscards ? 'Hide' : 'Show'}</button>}
      </h3>
      {showDiscards && s.discards.map((id) => (
        <div key={id} className={`mini ${cards[id].type}`}>
          <div className="mini-cues">{cards[id].cues.map((c, i) => <span key={i}>{c.text}</span>)}</div>
          <div className="mini-actions"><button onClick={() => s.toHand(id)}>To hand</button></div>
        </div>
      ))}
    </aside>
  )
}
