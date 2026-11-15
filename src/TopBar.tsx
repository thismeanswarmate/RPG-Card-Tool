import { useEffect, useRef, useState } from 'react'
import { GUIDE_STEPS, snapshot, useApi, useStore, WORLD_SIZES, type Mode, type WorldSize } from './store'
import { ToolNav } from './ToolNav'
import { TYPE_INFO } from './types'

const STEP_HELP = [
  'Draw a Terrain to found a new microsetting.',
  'Add a Site — a point of interest.',
  'Give the place a nickname with an Epithet.',
  'Add a Legacy from its past.',
  'Add a Trait of its present.',
  'Add an Omen for its future.',
]

const TABS: [Mode, string][] = [['custom', 'Custom'], ['auto', 'Auto']]

export function TopBar({ mode, onMode, onDecks }: { mode: Mode; onMode: (m: Mode) => void; onDecks: () => void }) {
  const s = useStore()
  const api = useApi()
  const [size, setSize] = useState<WorldSize>('small')
  const generate = () => {
    if (!Object.keys(s.placed).length || confirm('Replace the current generated world with a new one?')) s.generate(size)
  }
  const file = useRef<HTMLInputElement>(null)
  const { guide } = s
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    if (mode === 'custom' && guide.on && guide.drawn && !s.hand.length) s.guideNext()
  }, [mode, guide.on, guide.drawn, s.hand.length])

  const exportJson = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot(api), null, 2)], { type: 'application/json' }))
    a.download = 'worldloom-world.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (f: File | undefined) => {
    if (!f) return
    try {
      const data = JSON.parse(await f.text())
      if (!data || typeof data.placed !== 'object') throw new Error('not a Worldloom file')
      s.load(data)
    } catch (e) {
      alert(`Could not open that file: ${(e as Error).message}`)
    }
  }

  return (
    <header className="topbar">
      <ToolNav />
      <nav className="modes" aria-label="Mode">
        {TABS.map(([m, label]) => (
          <button key={m} className={m === mode ? 'on' : ''} aria-current={m === mode} onClick={() => onMode(m)}>{label}</button>
        ))}
      </nav>
      {mode === 'auto' && (
        <div className="guide">
          <select value={size} onChange={(e) => setSize(e.target.value as WorldSize)} aria-label="Map size">
            {Object.entries(WORLD_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="primary" onClick={generate}>Generate world</button>
        </div>
      )}
      {mode === 'custom' && (
        <label className="toggle">
          <input type="checkbox" checked={guide.on} onChange={(e) => s.setGuide({ on: e.target.checked })} /> Guided
        </label>
      )}
      {mode === 'custom' && guide.on && (
        <div className="guide">
          <div className="steps">
            {GUIDE_STEPS.map((t, i) => (
              <button key={t} className={`step ${t} ${i === guide.step ? 'on' : ''}`} onClick={() => s.setGuide({ step: i, drawn: false })}>
                {TYPE_INFO[t].label}
              </button>
            ))}
          </div>
          <span className="step-help">{guide.drawn ? 'Keep or discard the cards in your hand.' : STEP_HELP[guide.step]}</span>
          <button className="primary" disabled={guide.drawn} onClick={s.guideDraw}>Draw</button>
          <label className="toggle" title="Draw two Sites, Epithets and Traits and keep one or both">
            <input type="checkbox" checked={guide.complex} onChange={(e) => s.setGuide({ complex: e.target.checked })} /> Complex
          </label>
        </div>
      )}
      <div className="spacer" />
      <button className="menu-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button>
      <div className={`menu${menu ? ' open' : ''}`} onClick={() => setMenu(false)}>
      <button onClick={onDecks}>Decks</button>
      <button onClick={exportJson}>Export</button>
      <button onClick={() => file.current!.click()}>Import</button>
      <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = '' }} />
      <button onClick={() => confirm('Clear the table and start a new world? Your custom cards are kept.') && s.reset()}>New world</button>
      </div>
    </header>
  )
}
