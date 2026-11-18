import { createContext, useContext } from 'react'
import { useImages } from './imageStore'

export type Tool = 'setting' | 'worlds' | 'people' | 'lore' | 'stories' | 'perils' | 'settlements' | 'races' | 'cultures' | 'history' | 'emblems' | 'pictures'
export const ToolCtx = createContext<{ tool: Tool; setTool: (t: Tool) => void }>({ tool: 'setting', setTool: () => {} })

const TOOLS: [Tool, string][] = [['setting', 'Setting'], ['worlds', 'Worlds'], ['people', 'Characters'], ['lore', 'Lore'], ['stories', 'Stories'], ['perils', 'Perils'], ['settlements', 'Settlements'], ['races', 'Races'], ['cultures', 'Cultures'], ['history', 'History'], ['emblems', 'Emblems'], ['pictures', 'Pictures']]

/** The brand and the switch between the tools, shown at the left of every header. */
export function ToolNav() {
  const { tool, setTool } = useContext(ToolCtx)
  // How many pictures are in hand or waiting, shown on the Pictures tab from wherever you are.
  const busy = useImages((x) => x.queue.length + (x.current ? 1 : 0))
  return (
    <>
      <h1>Storyloom</h1>
      <nav className="tools" aria-label="Tool">
        {TOOLS.map(([t, label]) => (
          <button key={t} className={t === tool ? 'on' : ''} aria-current={t === tool} onClick={() => setTool(t)}>{label}{t === 'pictures' && busy > 0 && <span className="q-count" aria-label={`${busy} in the queue`}>{busy}</span>}</button>
        ))}
      </nav>
    </>
  )
}
