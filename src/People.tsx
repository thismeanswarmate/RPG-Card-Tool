import { useState } from 'react'
import { cardText, GENRES, portrait, SLOT_INFO, SLOTS, type Slot } from './people'
import { useLookup, usePeople } from './peopleStore'
import { ToolPicture } from './PictureBox'
import { ToolNav } from './ToolNav'

function CustomCards({ onClose }: { onClose: () => void }) {
  const s = usePeople()
  const [slot, setSlot] = useState<Slot>('role')
  const [text, setText] = useState('')
  const add = () => { s.addCustom(slot, text.trim()); setText('') }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>My character cards</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <p className="hint">Your own cards are shuffled in with every genre.</p>
        <div className="field">
          <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)} aria-label="Card type">
            {SLOTS.map((k) => <option key={k} value={k}>{SLOT_INFO[k].label}</option>)}
          </select>
          <input value={text} placeholder={SLOT_INFO[slot].hint} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && add()} />
          <div className="actions"><button className="primary" disabled={!text.trim()} onClick={add}>Add card</button></div>
        </div>
        {!s.custom.length && <p className="hint">Nothing here yet.</p>}
        {s.custom.map((c) => (
          <div key={c.id} className={`mini slot-${c.slot}`}>
            <div className="mini-cues"><span>{SLOT_INFO[c.slot].label}</span> {c.text}</div>
            <div className="mini-actions"><button onClick={() => s.removeCustom(c.id)}>Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function People() {
  const s = usePeople()
  const cards = useLookup()
  const [custom, setCustom] = useState(false)
  const [copied, setCopied] = useState(false)
  const person = s.people.find((p) => p.id === s.current)!
  const prose = portrait(person, cards)
  const filled = SLOTS.filter((k) => cards[person.cards[k] ?? '']).length

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prose.join('\n\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('Copying is not available here — select the text instead.')
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <ToolNav />
        <div className="chips" role="group" aria-label="Genres">
          {Object.entries(GENRES).map(([k, label]) => (
            <button key={k} className={s.genres.includes(k) ? 'on' : ''} aria-pressed={s.genres.includes(k)} onClick={() => s.toggleGenre(k)}>{label}</button>
          ))}
        </div>
        <div className="spacer" />
        <button onClick={() => setCustom(true)}>My cards</button>
      </header>
      <div className="people">
        <aside className="cast">
          <h3>Cast</h3>
          {s.people.map((p) => (
            <div key={p.id} className={`cast-row${p.id === s.current ? ' on' : ''}`}>
              <button className="cast-name" onClick={() => s.select(p.id)}>
                {p.name.trim() || 'Unnamed'}
                <small>{cards[p.cards.role ?? '']?.text ?? 'No role yet'}</small>
              </button>
              <button title="Remove character" aria-label="Remove character"
                onClick={() => (!Object.keys(p.cards).length || confirm(`Remove ${p.name.trim() || 'this character'}?`)) && s.remove(p.id)}>×</button>
            </div>
          ))}
          <button onClick={s.add}>+ New character</button>
        </aside>

        <main className="sheet">
          <div className="sheet-head">
            <input className="name" value={person.name} placeholder="Name this character" onChange={(e) => s.rename(e.target.value)} aria-label="Character name" />
            <button className="primary" onClick={s.generate}>{filled ? 'Redraw unlocked' : 'Generate character'}</button>
          </div>
          <div className="slots">
            {SLOTS.map((slot) => {
              const card = cards[person.cards[slot] ?? '']
              const locked = person.locked.includes(slot)
              return (
                <section key={slot} className={`pcard slot-${slot}${card ? '' : ' blank'}${locked ? ' locked' : ''}`}>
                  <header>
                    <b>{SLOT_INFO[slot].label}</b>
                    <small>{card && card.set !== 'core' ? (GENRES[card.set] ?? 'My card') : SLOT_INFO[slot].blurb}</small>
                  </header>
                  <p>{card ? cardText(card, person, cards) : '—'}</p>
                  <footer>
                    <button onClick={() => s.draw(slot)} disabled={locked}>{card ? 'Redraw' : 'Draw'}</button>
                    {card && <button className={locked ? 'on' : ''} aria-pressed={locked} onClick={() => s.toggleLock(slot)}>{locked ? 'Locked' : 'Lock'}</button>}
                    {card && <button onClick={() => s.clear(slot)}>Clear</button>}
                  </footer>
                </section>
              )
            })}
          </div>
        </main>

        <aside className="portrait">
          <h3>Portrait</h3>
          <ToolPicture tool="characters" id={person.id} label={person.name?.trim() ?? ''} text={prose} lead="A portrait of a character, head and shoulders, expressive face, looking at the viewer." shape="tall" />
          {prose.length ? (
            <>
              <div className="prose">{prose.map((t, i) => <p key={i}>{t}</p>)}</div>
              <div className="actions"><button onClick={copy}>{copied ? 'Copied' : 'Copy text'}</button></div>
            </>
          ) : (
            <p className="hint">Draw cards and they are written up here as a short portrait. Lock the ones you like, then redraw the rest.</p>
          )}
          <label className="notes">
            Notes
            <textarea value={person.notes} onChange={(e) => s.setNotes(e.target.value)} placeholder="Voice, looks, loose ends…" />
          </label>
        </aside>
      </div>
      {custom && <CustomCards onClose={() => setCustom(false)} />}
    </div>
  )
}
