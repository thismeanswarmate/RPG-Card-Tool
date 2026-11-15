import { createContext, useContext } from 'react'

export type Tool = 'worlds' | 'people'
export const ToolCtx = createContext<{ tool: Tool; setTool: (t: Tool) => void }>({ tool: 'worlds', setTool: () => {} })

const TOOLS: [Tool, string][] = [['worlds', 'Worlds'], ['people', 'Characters']]

/** The brand and the switch between the two tools, shown at the left of every header. */
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
