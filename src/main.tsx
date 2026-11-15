import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Decks } from './Decks'
import { Hand } from './Hand'
import { Panel } from './Panel'
import { Sidebar } from './Sidebar'
import { titleOf } from './logic'
import { cardsOf, useStore } from './store'
import { Table } from './Table'
import { TopBar } from './TopBar'
import './style.css'

if (!useStore.getState().init) useStore.getState().reset()

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

function App() {
  const [decks, setDecks] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)
  const handSize = useStore((s) => s.hand.length)
  const linking = useStore((s) => s.linking)
  useEffect(() => { if (handSize || linking) setSheet(null) }, [handSize, linking])
  const tab = (name: Sheet, label: string) => (
    <button className={sheet === name ? 'on' : ''} onClick={() => setSheet(sheet === name ? null : name)}>{label}</button>
  )
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      const s = useStore.getState()
      if (!s.selected) return
      if (e.key === 'r') s.rotate(s.selected)
      if (e.key === 'Delete' || e.key === 'Backspace') s.discard(s.selected)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  return (
    <div className={`app${sheet ? ` sheet-${sheet}` : ''}`}>
      <TopBar onDecks={() => setDecks(true)} />
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
