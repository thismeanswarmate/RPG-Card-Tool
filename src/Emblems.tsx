import { useState } from 'react'
import { Emblem, EmblemEditor } from './Emblem'
import { emblemCount, emblemFrom, ICONS, tidy, type EmblemSpec } from './emblem'
import { ToolNav } from './ToolNav'

const KEY = 'storyloom-emblem-v1'
const saved = (): EmblemSpec => { try { return tidy(JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? emblemFrom('first')) } catch { return emblemFrom('first') } }
const sheet = () => Array.from({ length: 24 }, () => emblemFrom(String(Math.random())))

/** The emblem maker on its own: a sheet of ideas to pick from, and every part open to change. */
export function Emblems() {
  const [spec, setSpec] = useState<EmblemSpec>(saved)
  const [ideas, setIdeas] = useState(sheet)
  const [icons, setIcons] = useState(false)
  const keep = (next: EmblemSpec) => { setSpec(next); try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private window */ } }
  return (
    <div className="app">
      <header className="topbar"><ToolNav /></header>
      <div className="emblems">
        <h2>Emblems</h2>
        <p className="hint">
          An emblem is a shape, a field, a border, three colours and an icon. There are {Math.round(emblemCount() / 1e6).toLocaleString()} million ways to put one together.
          Pick one from the sheet or build your own; in a setting, every land, race and culture carries one.
        </p>
        <EmblemEditor spec={spec} onChange={keep} />
        <h3>Ideas <button onClick={() => { setIdeas(sheet()); setIcons(false) }}>Shuffle</button> <button onClick={() => { setIdeas(ICONS.map((_, i) => ({ ...spec, icon: i, layout: 0 }))); setIcons(true) }}>Every icon on this one</button></h3>
        <div className="emblem-sheet">
          {ideas.map((x, i) => <button key={`${icons}${i}`} onClick={() => keep(x)} title={icons ? ICONS[x.icon][0] : 'Use this one'}><Emblem spec={x} size={72} /></button>)}
        </div>
      </div>
    </div>
  )
}
