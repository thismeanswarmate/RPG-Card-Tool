import { useState } from 'react'
import type { Rolls, Step } from './roller'
import type { RollerState } from './rollerStore'
import { ToolNav } from './ToolNav'

interface Props {
  useStore: () => RollerState
  stepsFor: (rolls: Rolls) => Step[]
  brief: (name: string, rolls: Rolls) => string[]
  /** A word or two for the list entry, such as the kind of place rolled. */
  summary: (rolls: Rolls) => string | undefined
  /** "Places" and "place", or "Settlements" and "settlement". */
  plural: string
  single: string
  emptyBrief: string
}

interface RowsProps {
  steps: Step[]
  rolls: Rolls
  locked: string[]
  onSet(table: string, index: number | undefined): void
  onRoll(table: string): void
  onLock(table: string): void
}

/** The tables, step by step: each a row with its die, the result to pick, a reroll and a lock. */
export function RollRows({ steps, rolls, locked, onSet, onRoll, onLock }: RowsProps) {
  return (
    <>
      {steps.map((step) => (
        <section key={step.title} className="step-block">
          <h3>{step.title} <small>{step.blurb}</small></h3>
          {step.tables.map((tb) => {
            const value = rolls[tb.id]
            const held = locked.includes(tb.id)
            return (
              <div key={tb.id} className={`roll${held ? ' locked' : ''}`}>
                <span className="die" title={`${tb.entries.length}-sided die`}>d{tb.entries.length}<b>{value === undefined ? '–' : value + 1}</b></span>
                <label>
                  <span>{tb.label}</span>
                  <select value={value ?? ''} disabled={held} onChange={(e) => onSet(tb.id, e.target.value === '' ? undefined : +e.target.value)}>
                    <option value="">Not rolled</option>
                    {tb.entries.map((entry, i) => <option key={i} value={i}>{i + 1}. {entry}</option>)}
                  </select>
                </label>
                <button onClick={() => onRoll(tb.id)} disabled={held} title="Roll this table" aria-label={`Roll ${tb.label}`}>↻</button>
                <button className={held ? 'on' : ''} aria-pressed={held} onClick={() => onLock(tb.id)} disabled={value === undefined}>{held ? 'Locked' : 'Lock'}</button>
              </div>
            )
          })}
        </section>
      ))}
    </>
  )
}

/** The screen shared by the table-rolling tools: a saved list, the tables step by step, and the brief. */
export function Roller({ useStore, stepsFor, brief, summary, plural, single, emptyBrief }: Props) {
  const s = useStore()
  const [copied, setCopied] = useState(false)
  const p = s.items.find((x) => x.id === s.current)!
  const steps = stepsFor(p.rolls)
  const prose = brief(p.name, p.rolls)
  const rolled = Object.values(p.rolls).some((v) => v !== undefined)

  const copy = async () => {
    try { await navigator.clipboard.writeText([p.name, ...prose].filter(Boolean).join('\n\n')); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { alert('Copying is not available here — select the text instead.') }
  }

  return (
    <div className="app">
      <header className="topbar"><ToolNav /></header>
      <div className="people">
        <aside className="cast">
          <h3>{plural}</h3>
          {s.items.map((x) => (
            <div key={x.id} className={`cast-row${x.id === s.current ? ' on' : ''}`}>
              <button className="cast-name" onClick={() => s.select(x.id)}>
                {x.name.trim() || 'Unnamed'}
                <small>{summary(x.rolls) ?? 'Nothing rolled yet'}</small>
              </button>
              <button title={`Remove ${single}`} aria-label={`Remove ${single}`}
                onClick={() => (!summary(x.rolls) || confirm(`Remove ${x.name.trim() || `this ${single}`}?`)) && s.remove(x.id)}>×</button>
            </div>
          ))}
          <button onClick={s.add}>+ New {single}</button>
        </aside>

        <main className="sheet">
          <div className="sheet-head">
            <input className="name" value={p.name} placeholder={`Name this ${single}`} onChange={(e) => s.rename(e.target.value)} aria-label="Name" />
            <button onClick={() => s.rename()} title="Draw a name">↻ Name</button>
            <button className="primary" onClick={s.rollAll}>{rolled ? 'Reroll unlocked' : 'Roll everything'}</button>
          </div>
          <p className="hint">
            Each row is a table and its die. Roll them all at once, reroll one at a time, or pick a result yourself. Lock what you want to keep.
            Results that seem to clash are worth keeping: explaining them is where the {single} comes alive.
          </p>
          <RollRows steps={steps} rolls={p.rolls} locked={p.locked} onSet={s.set} onRoll={s.roll} onLock={s.toggleLock} />
        </main>

        <aside className="portrait">
          <h3>Brief</h3>
          {prose.length ? (
            <>
              <div className="prose">{prose.map((x, i) => <p key={i}>{x}</p>)}</div>
              <div className="actions"><button onClick={copy}>{copied ? 'Copied' : 'Copy text'}</button></div>
            </>
          ) : (
            <p className="hint">{emptyBrief}</p>
          )}
          <label className="notes">
            Notes
            <textarea value={p.notes} onChange={(e) => s.setNotes(e.target.value)} placeholder="How do the pieces fit together?" />
          </label>
        </aside>
      </div>
    </div>
  )
}
