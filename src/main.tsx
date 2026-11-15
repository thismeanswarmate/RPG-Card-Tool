import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Decks } from './Decks'
import { Hand } from './Hand'
import { Lore } from './Lore'
import { Panel } from './Panel'
import { People } from './People'
import { ToolCtx, type Tool } from './ToolNav'
import { Sidebar } from './Sidebar'
import { titleOf } from './logic'
import { cardsOf, stores, useStore, WorldCtx, type Mode } from './store'
import { Table } from './Table'
import { TopBar } from './TopBar'
import './style.css'

type Sheet = 'piles' | 'details' | null

/** Phone only: quick actions for the selected card, shown above the tab bar. */
function SelectionBar({ onDetails }: { onDetails: () => void }) {
  const s = useStore()
  const sel = s.selected && s.placed[s.selected]
  if (!sel || s.hand.length) return null
  const cards = cardsOf(s)
  return (
    <div className="selbar">
      <b>{titleOf(s.placed, cards, sel.id)}</b>
      {cards[sel.id].cues.length > 1 && <button onClick={() => s.rotate(sel.id)}>Turn</button>}
      <button onClick={() => s.startLink(sel.id)}>Link</button>
      <button onClick={() => s.discard(sel.id)}>Discard</button>
      <button className="primary" onClick={onDetails}>Details</button>
    </div>
  )
}

const savedMode = (): Mode => {
  try { return localStorage.getItem('worldloom-tab') === 'auto' ? 'auto' : 'custom' } catch { return 'custom' }
}

const savedTool = (): Tool => {
  try {
    const t = localStorage.getItem('storyloom-tool')
    return t === 'people' || t === 'lore' ? t : 'worlds'
  } catch { return 'worlds' }
}

function App() {
  const [tool, setToolState] = useState<Tool>(savedTool)
  const setTool = (t: Tool) => {
    setToolState(t)
    try { localStorage.setItem('storyloom-tool', t) } catch { /* private window */ }
  }
  return (
    <ToolCtx.Provider value={{ tool, setTool }}>
      {tool === 'people' ? <People /> : tool === 'lore' ? <Lore /> : <Worlds />}
    </ToolCtx.Provider>
  )
}

function Worlds() {
  const [mode, setMode] = useState<Mode>(savedMode)
  const pickMode = (m: Mode) => {
    setMode(m)
    try { localStorage.setItem('worldloom-tab', m) } catch { /* private window */ }
  }
  return (
    <WorldCtx.Provider value={mode}>
      <World key={mode} mode={mode} onMode={pickMode} />
    </WorldCtx.Provider>
  )
}

function World({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  const [decks, setDecks] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)
  const { hand, linking } = useStore()
  const handSize = hand.length
  useEffect(() => { if (handSize || linking) setSheet(null) }, [handSize, linking])
  const tab = (name: Sheet, label: string) => (
    <button className={sheet === name ? 'on' : ''} onClick={() => setSheet(sheet === name ? null : name)}>{label}</button>
  )
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      const s = stores[mode].getState()
      if (!s.selected) return
      if (e.key === 'r') s.rotate(s.selected)
      if (e.key === 'Delete' || e.key === 'Backspace') s.discard(s.selected)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [mode])
  return (
    <div className={`app${sheet ? ` sheet-${sheet}` : ''}`}>
      <TopBar mode={mode} onMode={onMode} onDecks={() => setDecks(true)} />
      <div className="main">
        <Sidebar />
        <div className="stage">
          <Table />
          <Hand />
          {!sheet && <SelectionBar onDetails={() => setSheet('details')} />}
        </div>
        <Panel />
      </div>
      <nav className="tabs">
        {tab('piles', 'Piles')}
        {tab('details', 'Details')}
      </nav>
      {decks && <Decks onClose={() => setDecks(false)} />}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
