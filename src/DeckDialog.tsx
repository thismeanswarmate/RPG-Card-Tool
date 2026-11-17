import { useState } from 'react'
import { ThemeIcon } from './ThemeIcon'

export interface DeckItem {
  id: string
  label: string
  /** The deck whose mark to show beside the name, where it has one. */
  icon?: string
  note?: string
  on: boolean
  /** The kinds of card within the deck, for switching them on and off one by one. */
  parts?: { id: string; label: string; on: boolean }[]
}
export interface DeckGroup { title: string; items: DeckItem[] }

interface Props {
  title?: string
  intro: string
  groups: DeckGroup[]
  onToggle(id: string): void
  onClose(): void
}

/** Which decks are in the mix: a tick box for each, and with Advanced, one for each kind of card inside it. */
export function DeckDialog({ title = 'Decks', intro, groups, onToggle, onClose }: Props) {
  const hasParts = groups.some((g) => g.items.some((i) => i.parts?.length))
  const [advanced, setAdvanced] = useState(() => groups.some((g) => g.items.some((i) => i.parts?.some((p) => !p.on))))
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <p className="hint">{intro}</p>
        {groups.map((g, n) => (
          <section key={g.title} className="deck-group">
            <h3>
              {g.title}
              {n === 0 && hasParts && <label className="toggle"><input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} /> Advanced</label>}
            </h3>
            {g.items.map((item) => (
              <div key={item.id} className="expansion">
                <div className="deck-row">
                  <label><input type="checkbox" checked={item.on} onChange={() => onToggle(item.id)} /> <ThemeIcon deck={item.icon} plain /> {item.label}</label>
                  {item.note && <span className="count">{item.note}</span>}
                </div>
                {advanced && item.on && item.parts && item.parts.length > 1 && (
                  <div className="chips">
                    {item.parts.map((p) => <button key={p.id} className={p.on ? 'on' : ''} aria-pressed={p.on} onClick={() => onToggle(p.id)}>{p.label}</button>)}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
