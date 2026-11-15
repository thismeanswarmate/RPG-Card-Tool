import { useState } from 'react'
import { brief, kindLabel, stepsFor } from './peril'
import { usePerils } from './perilStore'
import { ToolNav } from './ToolNav'

export function Perils() {
  const s = usePerils()
  const [copied, setCopied] = useState(false)
  const p = s.perils.find((x) => x.id === s.current)!
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
          <h3>Places</h3>
          {s.perils.map((x) => (
            <div key={x.id} className={`cast-row${x.id === s.current ? ' on' : ''}`}>
              <button className="cast-name" onClick={() => s.select(x.id)}>
                {x.name.trim() || 'Unnamed'}
                <small>{x.rolls.kind === undefined ? 'Nothing rolled yet' : kindLabel(x.rolls)}</small>
              </button>
              <button title="Remove place" aria-label="Remove place"
                onClick={() => (x.rolls.kind === undefined || confirm(`Remove ${x.name.trim() || 'this place'}?`)) && s.remove(x.id)}>×</button>
            </div>
          ))}
          <button onClick={s.add}>+ New place</button>
        </aside>

        <main className="sheet">
          <div className="sheet-head">
            <input className="name" value={p.name} placeholder="Name this place" onChange={(e) => s.rename(e.target.value)} aria-label="Place name" />
            <button onClick={() => s.rename()} title="Draw a name">↻ Name</button>
            <button className="primary" onClick={s.rollAll}>{rolled ? 'Reroll unlocked' : 'Roll everything'}</button>
          </div>
          <p className="hint">
            Each row is a table and its die. Roll them all at once, reroll one at a time, or pick a result yourself. Lock what you want to keep.
            Results that seem to clash are worth keeping: explaining them is where the place comes alive.
          </p>
          {steps.map((step) => (
            <section key={step.title} className="step-block">
              <h3>{step.title} <small>{step.blurb}</small></h3>
              {step.tables.map((tb) => {
                const value = p.rolls[tb.id]
                const locked = p.locked.includes(tb.id)
                return (
                  <div key={tb.id} className={`roll${locked ? ' locked' : ''}`}>
                    <span className="die" title={`${tb.entries.length}-sided die`}>d{tb.entries.length}<b>{value === undefined ? '–' : value + 1}</b></span>
                    <label>
                      <span>{tb.label}</span>
                      <select value={value ?? ''} disabled={locked} onChange={(e) => s.set(tb.id, e.target.value === '' ? undefined : +e.target.value)}>
                        <option value="">Not rolled</option>
                        {tb.entries.map((entry, i) => <option key={i} value={i}>{i + 1}. {entry}</option>)}
                      </select>
                    </label>
                    <button onClick={() => s.roll(tb.id)} disabled={locked} title="Roll this table" aria-label={`Roll ${tb.label}`}>↻</button>
                    <button className={locked ? 'on' : ''} aria-pressed={locked} onClick={() => s.toggleLock(tb.id)} disabled={value === undefined}>{locked ? 'Locked' : 'Lock'}</button>
                  </div>
                )
              })}
            </section>
          ))}
        </main>

        <aside className="portrait">
          <h3>Brief</h3>
          {prose.length ? (
            <>
              <div className="prose">{prose.map((x, i) => <p key={i}>{x}</p>)}</div>
              <div className="actions"><button onClick={copy}>{copied ? 'Copied' : 'Copy text'}</button></div>
            </>
          ) : (
            <p className="hint">Roll the tables and the place is written up here: what it is, where it stands, what was there before, and what makes it dangerous.</p>
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
