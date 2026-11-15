import { childrenOf, cueText, rootOf, subtree, titleOf } from './logic'
import { cardsOf, useStore, viewport } from './store'
import { isHub, TYPE_INFO } from './types'

export function Panel() {
  const s = useStore()
  const cards = cardsOf(s)
  const sel = s.selected ? s.placed[s.selected] : null

  const goTo = (id: string) => {
    const p = s.placed[id]
    s.select(id)
    s.setView({ ...s.view, x: viewport.w / 2 - (p.x + 75) * s.view.k, y: viewport.h / 2 - (p.y + 75) * s.view.k })
  }

  if (!sel) {
    const roots = Object.values(s.placed).filter((p) => !p.parent && isHub(cards[p.id].type))
    return (
      <aside className="panel">
        <h3>World</h3>
        {roots.length ? (
          <ul className="roots">
            {roots.map((r) => (
              <li key={r.id}><button className="link" onClick={() => goTo(r.id)}>{titleOf(s.placed, cards, r.id)}</button></li>
            ))}
          </ul>
        ) : (
          <p className="hint">No microsettings yet.</p>
        )}
        {s.meta.length > 0 && (
          <>
            <h4>World-wide</h4>
            <ul>{s.meta.map((m) => <li key={m.card}>{cards[m.card].cues[m.active].text}</li>)}</ul>
          </>
        )}
        <h4>How it works</h4>
        <ul className="help">
          <li><b>Drag</b> a card near a Terrain or Site edge to tuck it under.</li>
          <li><b>Double-click</b> a card to turn it to its next cue.</li>
          <li>Drag the table to pan; scroll to zoom.</li>
          <li>Select a card to see its microsetting and write notes.</li>
        </ul>
      </aside>
    )
  }

  const def = cards[sel.id]
  const root = rootOf(s.placed, sel.id)
  const hubs = subtree(s.placed, root).filter((id) => isHub(cards[id].type))
  const links = s.links.filter((l) => l.a === sel.id || l.b === sel.id)

  return (
    <aside className="panel">
      <h3>{titleOf(s.placed, cards, root)}</h3>
      {hubs.map((h) => {
        const kids = childrenOf(s.placed, h).filter((k) => !isHub(cards[k.id].type) && cards[k.id].type !== 'epithet')
        return (
          <div key={h} className="hub">
            {h !== root && <h4>{titleOf(s.placed, cards, h)}</h4>}
            {kids.map((k) => {
              const cue = cards[k.id].cues[k.active]
              return (
                <p key={k.id} className={`fact ${cards[k.id].type}`}>
                  <span>{TYPE_INFO[cards[k.id].type].label}</span> {cue.text}
                  {cue.sub && <i> — {cue.sub}</i>}
                </p>
              )
            })}
          </div>
        )
      })}
      <label className="notes">
        Notes
        <textarea value={s.notes[root] ?? ''} onChange={(e) => s.setNote(root, e.target.value)} placeholder="What does it all mean here?" />
      </label>

      <h4>Selected: {TYPE_INFO[def.type].label} — {cueText(cards, sel)}</h4>
      <div className="actions">
        {def.cues.length > 1 && <button onClick={() => s.rotate(sel.id)}>Turn</button>}
        <button onClick={() => s.startLink(sel.id)}>Link…</button>
        {!isHub(def.type) && <button onClick={() => s.toMeta(sel.id)}>To meta</button>}
        <button onClick={() => s.toHand(sel.id)}>To hand</button>
        <button onClick={() => s.discard(sel.id)}>Discard</button>
      </div>
      {links.length > 0 && <h4>Links</h4>}
      {links.map((l) => {
        const other = l.a === sel.id ? l.b : l.a
        return (
          <div key={l.id} className="link-row">
            <button className="link" onClick={() => goTo(other)}>↔ {cueText(cards, s.placed[other])}</button>
            <input value={l.note} placeholder="How are they connected?" onChange={(e) => s.setLink(l.id, e.target.value)} />
            <button onClick={() => s.setLink(l.id, null)} title="Remove link">×</button>
          </div>
        )
      })}
    </aside>
  )
}
