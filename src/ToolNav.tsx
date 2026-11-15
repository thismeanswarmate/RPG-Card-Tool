import { createContext, useContext } from 'react'

export type Tool = 'setting' | 'worlds' | 'people' | 'lore' | 'stories' | 'perils' | 'settlements' | 'races' | 'cultures' | 'history'
export const ToolCtx = createContext<{ tool: Tool; setTool: (t: Tool) => void }>({ tool: 'setting', setTool: () => {} })

const TOOLS: [Tool, string][] = [['setting', 'Setting'], ['worlds', 'Worlds'], ['people', 'Characters'], ['lore', 'Lore'], ['stories', 'Stories'], ['perils', 'Perils'], ['settlements', 'Settlements'], ['races', 'Races'], ['cultures', 'Cultures'], ['history', 'History']]

/** The brand and the switch between the tools, shown at the left of every header. */
export function ToolNav() {
  const { tool, setTool } = useContext(ToolCtx)
  return (
    <>
      <h1>Storyloom</h1>
      <nav className="tools" aria-label="Tool">
        {TOOLS.map(([t, label]) => (
          <button key={t} className={t === tool ? 'on' : ''} aria-current={t === tool} onClick={() => setTool(t)}>{label}</button>
        ))}
      </nav>
    </>
  )
}
