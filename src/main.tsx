import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Decks } from './Decks'
import { Hand } from './Hand'
import { Panel } from './Panel'
import { Sidebar } from './Sidebar'
import { useStore } from './store'
import { Table } from './Table'
import { TopBar } from './TopBar'
import './style.css'

if (!useStore.getState().init) useStore.getState().reset()

function App() {
  const [decks, setDecks] = useState(false)
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
    <div className="app">
      <TopBar onDecks={() => setDecks(true)} />
      <div className="main">
        <Sidebar />
        <div className="stage">
          <Table />
          <Hand />
        </div>
        <Panel />
      </div>
      {decks && <Decks onClose={() => setDecks(false)} />}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
