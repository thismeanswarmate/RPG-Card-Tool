import { useState } from 'react'
import { EXPANSION_CARDS, EXPANSIONS } from './expansions'
import { STARTER } from './starter'
import { useStore } from './store'
import { TYPE_INFO, TYPES, type CardDef, type CardType, type Cue } from './types'

const LABELS: Record<CardType, string[]> = {
  terrain: ['Terrain'],
  site: ['First site', 'Second site'],
  epithet: ['Opening word (e.g. “Whispering”)', 'Ending (e.g. “of Lanterns”)', 'Ending', 'Ending'],
  legacy: ['Past event', 'Past event', 'Past event', 'Past event'],
  trait: ['Present-day trait', 'Present-day trait', 'Present-day trait', 'Present-day trait'],
  omen: ['First event', 'Second event'],
  question: ['Question', 'Question', 'Question', 'Question'],
  work: ['A kind of lore, e.g. “A lullaby”', 'A kind of lore', 'A kind of lore', 'A kind of lore'],
  twist: ['A twist, e.g. “in exactly four lines”', 'A twist', 'A twist', 'A twist'],
  quest: ['Quest title'],
}

const DESC_HINT: Partial<Record<CardType, string>> = {
  terrain: 'Description, e.g. “Across {place} the grass runs to the horizon.”',
  site: 'Description, e.g. “The lamp of {place} can be seen across {terrain}.”',
  epithet: 'Why the name, e.g. “for the lamps hung at every door”',
  legacy: 'Description, e.g. “Mutineers founded {place} long ago.”',
  trait: 'Description, e.g. “Every household in {place} keeps bees.”',
  omen: 'Description, e.g. “A stranger has arrived in {place}.”',
}

const blank = (type: CardType): CardDef => ({
  id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  type, deck: 'custom', cues: LABELS[type].map(() => ({ text: '' })),
})

export function Decks({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [edit, setEdit] = useState<CardDef | null>(null)
  const [advanced, setAdvanced] = useState(() => EXPANSIONS.some((x) => { const on = s.expansions[x.id]; return on && on.length < x.types.length }))
  const isNew = edit && !s.custom.some((c) => c.id === edit.id)
  const setCue = (i: number, patch: Partial<Cue>) =>
    setEdit({ ...edit!, cues: edit!.cues.map((c, n) => (n === i ? { ...c, ...patch } : c)) })
  const valid = edit?.cues.every((c) => c.text.trim())

  const save = () => {
    s.saveCustom({
      ...edit!,
      cues: edit!.cues.map((c) => ({
        text: c.text.trim(),
        ...(c.sub?.trim() ? { sub: c.sub.trim() } : {}),
        ...(c.desc?.trim() ? { desc: c.desc.trim() } : {}),
      })),
    })
    setEdit(null)
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Decks</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="deck-row">
          <label><input type="checkbox" checked={!s.disabled.includes('starter')} onChange={() => s.toggleDeck('starter')} /> Starter deck</label>
          <span className="count">{STARTER.length} cards</span>
        </div>
        <div className="deck-row">
          <label><input type="checkbox" checked={!s.disabled.includes('custom')} onChange={() => s.toggleDeck('custom')} /> My cards</label>
          <span className="count">{s.custom.length} cards</span>
        </div>
        <h3>
          Expansions
          <label className="toggle"><input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} /> Advanced</label>
        </h3>
        {EXPANSIONS.map((x, i) => {
          const on = s.expansions[x.id] ?? []
          const count = EXPANSION_CARDS.filter((c) => c.deck === x.id && on.includes(c.type)).length
          const total = EXPANSION_CARDS.filter((c) => c.deck === x.id).length
          return (
            <div key={x.id} className="expansion">
              {EXPANSIONS[i - 1]?.group !== x.group && <h4>{x.group}</h4>}
              <div className="deck-row">
                <label>
                  <input type="checkbox" checked={on.length > 0} onChange={() => s.toggleExpansion(x.id)}
                    ref={(el) => { if (el) el.indeterminate = on.length > 0 && on.length < x.types.length }} /> {x.name}
                </label>
                <span className="count">{on.length ? `${count} of ${total}` : total} cards</span>
              </div>
              <p className="hint">{x.blurb}</p>
              {advanced && (
                <div className="chips">
                  {x.types.map((t) => (
                    <button key={t} className={on.includes(t) ? 'on' : ''} aria-pressed={on.includes(t)} onClick={() => s.toggleExpansionType(x.id, t)}>
                      {TYPE_INFO[t].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <p className="hint">
          Turning a deck or expansion on or off reshuffles the draw piles. Cards already on the table stay there.
          {advanced && ' With Advanced on, pick exactly which kinds of card each expansion adds.'}
        </p>

        {edit ? (
          <div className="editor">
            <h3>{isNew ? 'New' : 'Edit'} {TYPE_INFO[edit.type].label} card</h3>
            {edit.cues.map((c, i) => (
              <div key={i} className="field">
                <input autoFocus={i === 0} value={c.text} placeholder={LABELS[edit.type][i]} onChange={(e) => setCue(i, { text: e.target.value })} />
                {(edit.type === 'omen' || edit.type === 'quest') && (
                  <input value={c.sub ?? ''} placeholder={edit.type === 'quest' ? 'One-line summary of the hook' : 'Optional ways to read it'} onChange={(e) => setCue(i, { sub: e.target.value })} />
                )}
                {DESC_HINT[edit.type] && (
                  <input value={c.desc ?? ''} placeholder={DESC_HINT[edit.type]} onChange={(e) => setCue(i, { desc: e.target.value })} />
                )}
              </div>
            ))}
            {DESC_HINT[edit.type] && <p className="hint">
              Descriptions are optional and are stitched into the written account of an area. They can mention the cards around
              them: <code>{'{place}'}</code> is the Terrain or Site the card sits on, <code>{'{terrain}'}</code> the land it belongs
              to, and <code>{'{site|the old road}'}</code> another Site nearby, or the words after the bar when there is none.
            </p>}
            <div className="actions">
              <button className="primary" disabled={!valid} onClick={save}>Save card</button>
              <button onClick={() => setEdit(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h3>Add a card</h3>
            <div className="actions">
              {TYPES.map((t) => <button key={t} className={`step ${t} on`} onClick={() => setEdit(blank(t))}>{TYPE_INFO[t].label}</button>)}
            </div>
            <h3>My cards</h3>
            {!s.custom.length && <p className="hint">Nothing here yet.</p>}
            {s.custom.map((c) => (
              <div key={c.id} className={`mini ${c.type}`}>
                <div className="mini-cues">{c.cues.map((q, i) => <span key={i}>{q.text}</span>)}</div>
                <div className="mini-actions">
                  <button onClick={() => setEdit(c)}>Edit</button>
                  <button onClick={() => confirm('Delete this card?') && s.deleteCustom(c.id)}>Delete</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
