import { useState } from 'react'
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
}

const blank = (type: CardType): CardDef => ({
  id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  type, deck: 'custom', cues: LABELS[type].map(() => ({ text: '' })),
})

export function Decks({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [edit, setEdit] = useState<CardDef | null>(null)
  const isNew = edit && !s.custom.some((c) => c.id === edit.id)
  const setCue = (i: number, patch: Partial<Cue>) =>
    setEdit({ ...edit!, cues: edit!.cues.map((c, n) => (n === i ? { ...c, ...patch } : c)) })
  const valid = edit?.cues.every((c) => c.text.trim())

  const save = () => {
    s.saveCustom({ ...edit!, cues: edit!.cues.map((c) => ({ text: c.text.trim(), ...(c.sub?.trim() ? { sub: c.sub.trim() } : {}) })) })
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
        <p className="hint">Turning a deck off reshuffles the draw piles. Cards already on the table stay there.</p>

        {edit ? (
          <div className="editor">
            <h3>{isNew ? 'New' : 'Edit'} {TYPE_INFO[edit.type].label} card</h3>
            {edit.cues.map((c, i) => (
              <div key={i} className="field">
                <input autoFocus={i === 0} value={c.text} placeholder={LABELS[edit.type][i]} onChange={(e) => setCue(i, { text: e.target.value })} />
                {edit.type === 'omen' && (
                  <input value={c.sub ?? ''} placeholder="Optional ways to read it" onChange={(e) => setCue(i, { sub: e.target.value })} />
                )}
              </div>
            ))}
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
