import { useEffect, useRef, useState } from 'react'
import { GUIDE_STEPS, snapshot, useStore } from './store'
import { TYPE_INFO } from './types'

const STEP_HELP = [
  'Draw a Terrain to found a new microsetting.',
  'Add a Site — a point of interest.',
  'Give the place a nickname with an Epithet.',
  'Add a Legacy from its past.',
  'Add a Trait of its present.',
  'Add an Omen for its future.',
]

export function TopBar({ onDecks }: { onDecks: () => void }) {
  const s = useStore()
  const file = useRef<HTMLInputElement>(null)
  const { guide } = s
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    if (guide.on && guide.drawn && !s.hand.length) s.guideNext()
  }, [guide.on, guide.drawn, s.hand.length])

  const exportJson = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }))
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
      <h1>Worldloom</h1>
      <label className="toggle">
        <input type="checkbox" checked={guide.on} onChange={(e) => s.setGuide({ on: e.target.checked })} /> Guided
      </label>
      {guide.on && (
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
