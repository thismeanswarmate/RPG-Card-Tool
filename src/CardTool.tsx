import { useState } from 'react'
import { cardOf, cardsOf, deckOn, text, type Section, type ToolDef } from './cardTool'
import type { CardToolState } from './cardToolStore'
import { DeckDialog, type DeckGroup } from './DeckDialog'
import { ToolPicture } from './PictureBox'
import { ThemeIcon } from './ThemeIcon'
import { ToolNav } from './ToolNav'

interface Props {
  def: ToolDef
  useStore: () => CardToolState
  plural: string
  single: string
  blurb: string
}

interface RowsProps {
  def: ToolDef
  section: Section
  onDraw(aspect: string): void
  onPick(aspect: string, cue: number): void
  onLock(aspect: string): void
  onClear(aspect: string): void
}

/** The aspects of one section, each a row: the options that came up, a redraw, a lock, and for optional ones a way to drop it. */
export function AspectRows({ def, section, onDraw, onPick, onLock, onClear }: RowsProps) {
  return (
    <>
      {def.aspects.map((a) => {
        const held = section.slots[a.id]
        const card = held && cardOf(def, held.card)
        return (
          <div key={a.id} className={`draw row${held?.locked ? ' locked' : ''}`}>
            <span className="draw-label" title={a.hint}>{a.label} <ThemeIcon deck={card?.deck} /></span>
            {card?.cues.map((cue, k) => (
              <button key={k} className={k === held!.active ? 'opt on' : 'opt'} aria-pressed={k === held!.active} disabled={held!.locked} onClick={() => onPick(a.id, k)}>{cue}</button>
            ))}
            <button className="redraw" disabled={held?.locked} onClick={() => onDraw(a.id)}>{held ? '↻ Redraw' : '+ Draw'}</button>
            {held && <button className={`redraw${held.locked ? ' on' : ''}`} aria-pressed={!!held.locked} onClick={() => onLock(a.id)}>{held.locked ? 'Locked' : 'Lock'}</button>}
            {held && a.optional && !held.locked && <button className="redraw" title={`Leave “${a.label}” out`} aria-label={`Leave ${a.label} out`} onClick={() => onClear(a.id)}>×</button>}
          </div>
        )
      })}
    </>
  )
}

/** The screen shared by the card tools: a saved list, each aspect as a draw to pick from, and the result written out. */
export function CardTool({ def, useStore, plural, single, blurb }: Props) {
  const s = useStore()
  const [copied, setCopied] = useState(false)
  const [decks, setDecks] = useState(false)
  const item = s.items.find((x) => x.id === s.current)!
  const prose = text(def, item)
  const drawn = item.sections.some((x) => Object.values(x.slots).some(Boolean))
  const many = def.sections

  const deck = (id: string, label: string) => {
    const cards = cardsOf(def).filter((c) => c.deck === id)
    return {
      id: id === 'core' ? '-core' : id, label, icon: id, note: `${cards.length} draws`, on: deckOn(id, s.packs),
      parts: def.aspects.filter((a) => cards.some((c) => c.aspect === a.id)).map((a) => ({ id: `-${id}:${a.id}`, label: a.label, on: !s.packs.includes(`-${id}:${a.id}`) })),
    }
  }
  const groups: DeckGroup[] = [
    { title: 'Main deck', items: [deck('core', 'Core')] },
    { title: 'Optional decks', items: Object.entries(def.packs).map(([id, label]) => deck(id, label)) },
  ]
  const copy = async () => {
    try { await navigator.clipboard.writeText([item.name, ...prose].filter(Boolean).join('\n\n')); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { alert('Copying is not available here — select the text instead.') }
  }

  return (
    <div className="app">
      <header className="topbar">
        <ToolNav />
        <button className="decks-button" onClick={() => setDecks(true)}>Decks <small>{groups.flatMap((g) => g.items).filter((i) => i.on).length} in the mix</small></button>
      </header>
      {decks && (
        <DeckDialog groups={groups} onToggle={s.togglePack} onClose={() => setDecks(false)}
          intro="Tick the decks to draw from. What is already drawn stays; the choice applies to what is drawn from now on. With Advanced, a deck can be left out of single aspects." />
      )}
      <div className="people">
        <aside className="cast">
          <h3>{plural}</h3>
          {s.items.map((x) => {
            const first = text(def, x)[0]
            return (
              <div key={x.id} className={`cast-row${x.id === s.current ? ' on' : ''}`}>
                <button className="cast-name" onClick={() => s.select(x.id)}>
                  {x.name.trim() || 'Unnamed'}
                  <small>{first ?? 'Nothing drawn yet'}</small>
                </button>
                <button title={`Remove ${single}`} aria-label={`Remove ${single}`} onClick={() => (!first || confirm(`Remove ${x.name.trim() || `this ${single}`}?`)) && s.remove(x.id)}>×</button>
              </div>
            )
          })}
          <button onClick={s.add}>+ New {single}</button>
        </aside>

        <main className="sheet">
          <div className="sheet-head">
            <input className="name" value={item.name} placeholder={`Name this ${single}`} onChange={(e) => s.rename(e.target.value)} aria-label="Name" />
            <button onClick={() => s.rename()} title="Draw a name">↻ Name</button>
            <button className="primary" onClick={() => s.fill()}>{drawn ? 'Redraw unlocked' : 'Draw everything'}</button>
          </div>
          <p className="hint">{blurb} Each row is one draw: pick between the options that came up, or redraw for a fresh set. Lock what you want to keep.</p>
          {item.sections.map((section, i) => (
            <section key={i} className="step-block">
              {many && (
                <h3>
                  {many.label} {i + 1}
                  <span className="section-actions">
                    <button onClick={() => s.fill(i)}>↻ Redraw this {many.label.toLowerCase()}</button>
                    {item.sections.length > 1 && <button onClick={() => confirm(`Remove ${many.label.toLowerCase()} ${i + 1}?`) && s.removeSection(i)}>Remove</button>}
                  </span>
                </h3>
              )}
              <AspectRows def={def} section={section} onDraw={(id) => s.draw(i, id)} onPick={(id, k) => s.pick(i, id, k)} onLock={(id) => s.toggleLock(i, id)} onClear={(id) => s.clear(i, id)} />
            </section>
          ))}
          {many && item.sections.length < many.max && <button onClick={s.addSection}>+ Add {/^[aeiou]/i.test(many.label) ? 'an' : 'a'} {many.label.toLowerCase()}</button>}
        </main>

        <aside className="portrait">
          <h3>Written out</h3>
          <ToolPicture tool={def.id} id={item.id} label={item.name.trim()} text={text(def, { ...item, name: '' }).slice(def.intro ? 1 : 0)} lead={def.picture.lead} shape={def.picture.shape} />
          {prose.length ? (
            <>
              <div className="prose">{prose.map((x, i) => <p key={i}>{x}</p>)}</div>
              <div className="actions"><button onClick={copy}>{copied ? 'Copied' : 'Copy text'}</button></div>
            </>
          ) : (
            <p className="hint">Draw and it is written out here as you go.</p>
          )}
          <label className="notes">
            Notes
            <textarea value={item.notes} onChange={(e) => s.setNotes(e.target.value)} placeholder="What does this change?" />
          </label>
        </aside>
      </div>
    </div>
  )
}
