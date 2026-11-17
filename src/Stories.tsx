import { useState } from 'react'
import { DeckDialog, type DeckGroup } from './DeckDialog'
import { CARD, deckOn, KIND_INFO, PACKS, PATTERN, PATTERNS, slotsOf, STORY_CARDS, write, type CardKind } from './story'
import { useStories } from './storyStore'
import { ToolPicture } from './PictureBox'
import { ThemeIcon } from './ThemeIcon'
import { ToolNav } from './ToolNav'

export function Stories() {
  const s = useStories()
  const [copied, setCopied] = useState(false)
  const [decks, setDecks] = useState(false)
  const deck = (id: string, label: string) => {
    const cards = STORY_CARDS.filter((c) => c.deck === id)
    const kinds = [...new Set(cards.map((c) => c.kind))] as CardKind[]
    return {
      id: id === 'core' ? '-core' : id, label, icon: id, note: `${cards.length} cards`, on: deckOn(id, s.packs),
      parts: kinds.map((k) => ({ id: `-${id}:${k}`, label: KIND_INFO[k].label, on: !s.packs.includes(`-${id}:${k}`) })),
    }
  }
  const groups: DeckGroup[] = [
    { title: 'Main deck', items: [deck('core', 'Core')] },
    { title: 'Genres', items: ['fantasy', 'scifi', 'horror', 'mystery'].map((id) => deck(id, PACKS[id])) },
    { title: 'Extras', items: ['curios', 'dynamics', 'pasts'].map((id) => deck(id, PACKS[id])) },
  ]
  const inPlay = groups.flatMap((g) => g.items).filter((i) => i.on).length
  const story = s.stories.find((x) => x.id === s.current)!
  const pattern = PATTERN[story.pattern] ?? PATTERNS[0]
  const defs = slotsOf(story.pattern, s.packs)
  const prose = write(story)
  const filled = defs.some((d) => story.slots[d.id])

  const copy = async () => {
    try { await navigator.clipboard.writeText(prose.join('\n\n')); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { alert('Copying is not available here — select the text instead.') }
  }

  return (
    <div className="app">
      <header className="topbar">
        <ToolNav />
        <button className="decks-button" onClick={() => setDecks(true)}>Decks <small>{inPlay} in the mix</small></button>
      </header>
      {decks && (
        <DeckDialog groups={groups} onToggle={s.togglePack} onClose={() => setDecks(false)}
          intro="Tick the decks to draw from. Cards already on the table stay; the choice applies to what is drawn from now on. With Advanced, each kind of card in a deck can be left out." />
      )}
      <div className="people">
        <aside className="cast">
          <h3>Stories</h3>
          {s.stories.map((x) => {
            const text = write(x)[0]
            return (
              <div key={x.id} className={`cast-row${x.id === s.current ? ' on' : ''}`}>
                <button className="cast-name" onClick={() => s.select(x.id)}>
                  {(PATTERN[x.pattern] ?? PATTERNS[0]).name}
                  <small>{text ?? 'Nothing drawn yet'}</small>
                </button>
                <button title="Remove story" aria-label="Remove story" onClick={() => (!text || confirm('Remove this story?')) && s.remove(x.id)}>×</button>
              </div>
            )
          })}
          <button onClick={s.add}>+ New story</button>
        </aside>

        <main className="sheet">
          <div className="sheet-head">
            <select className="name" value={story.pattern} onChange={(e) => s.setPattern(e.target.value)} aria-label="Prompt pattern">
              {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="primary" onClick={s.generate}>{filled ? 'Redraw unlocked' : 'Draw a prompt'}</button>
          </div>
          <p className="hint">{pattern.blurb} Each card has several cues: <b>Turn</b> it to use the next one, or <b>Redraw</b> for a different card.</p>
          <div className="slots">
            {defs.map((def) => {
              const held = story.slots[def.id]
              const card = held && CARD[held.card]
              return (
                <section key={def.id} className={`pcard sk-${card?.kind ?? def.kind}${card ? '' : ' blank'}${held?.locked ? ' locked' : ''}`}>
                  <header>
                    <b>{def.label} <ThemeIcon deck={card?.deck} /></b>
                    <small>{card ? KIND_INFO[card.kind].label : def.optional ? 'Optional' : KIND_INFO[def.kind].hint}</small>
                  </header>
                  <p>{card ? card.cues[held.active] : '—'}</p>
                  {card && <small className="others">Also on this card: {card.cues.filter((_, i) => i !== held.active).join(' · ')}</small>}
                  <footer>
                    {card && <button onClick={() => s.turn(def.id)} disabled={held.locked}>Turn</button>}
                    <button onClick={() => s.draw(def.id)} disabled={held?.locked}>{card ? 'Redraw' : 'Draw'}</button>
                    {def.alt && <button onClick={() => s.draw(def.id, true)} disabled={held?.locked} title={`Use a ${KIND_INFO[def.alt].label} here instead, or switch back`}>⇄</button>}
                    {card && <button className={held.locked ? 'on' : ''} aria-pressed={!!held.locked} onClick={() => s.toggleLock(def.id)}>{held.locked ? 'Locked' : 'Lock'}</button>}
                    {card && <button onClick={() => s.clear(def.id)}>Clear</button>}
                  </footer>
                </section>
              )
            })}
          </div>
        </main>

        <aside className="portrait">
          <h3>Prompt</h3>
          <ToolPicture tool="stories" id={story.id} label={pattern.name} text={prose} lead="An illustration of the opening scene of a story." shape="wide" />
          {prose.length ? (
            <>
              <div className="prose">{prose.map((t, i) => <p key={i}>{t}</p>)}</div>
              <div className="actions"><button onClick={copy}>{copied ? 'Copied' : 'Copy text'}</button></div>
            </>
          ) : (
            <p className="hint">Draw cards and they are read out here as a prompt. Take it literally or loosely — it is a starting point, not a plot.</p>
          )}
          <label className="notes">
            Notes
            <textarea value={story.notes} onChange={(e) => s.setNotes(e.target.value)} placeholder="Where does this go?" />
          </label>
        </aside>
      </div>
    </div>
  )
}
