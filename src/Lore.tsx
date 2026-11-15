import { useRef, useState } from 'react'
import { describeNode, detailParts, KIND_LABEL, kindsFor, PACK_LABEL, refText, title, webText, type LoreNode, type Packs } from './lore'
import { useLore, type Pending } from './loreStore'
import { ToolNav } from './ToolNav'

const NODE = { w: 250, cx: 125, cy: 70 }
const PAD = 60

const HEADING: Record<Pending['t'], string> = {
  primary: 'Choose what it is',
  detail: 'Choose a detail',
  link: 'Complete the link',
  modifier: 'Choose what sets it apart',
}

function Picker() {
  const s = useLore()
  const p = s.pending
  if (!p) return null
  const node = 'node' in p ? s.web[p.node] : undefined
  return (
    <div className="modal-back" onClick={s.cancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{HEADING[p.t]}</h2>
          <span className="actions">
            <button onClick={s.reroll}>Draw again</button>
            <button onClick={s.cancel}>Cancel</button>
          </span>
        </header>
        {node && <p className="hint">For {title(node).replace(/^The/, 'the')}{p.t === 'link' && `: “${detailParts(node.details[p.detail]).map((x) => (typeof x === 'string' ? x : refText(x, s.web))).join('')}”`}</p>}
        <div className="options">
          {p.t === 'link'
            ? p.options.map((o, i) => (
                <button key={i} className={`option lk-${o.kind}`} onClick={() => s.choose(i)}>
                  <small>{o.node ? 'Already in the web' : `New ${KIND_LABEL[o.kind].toLowerCase()}`}</small>
                  {o.node ? title(s.web[o.node]) : o.primary}
                </button>
              ))
            : p.options.map((o, i) => (
                <button key={i} className={`option lk-${p.t === 'primary' ? p.kind : node?.kind}`} onClick={() => s.choose(i)}>
                  {p.t === 'detail' ? o.replace(/\{([a-z/]+)\}/g, (_, k: string) => `[${k.split('/').map((x) => KIND_LABEL[x as keyof typeof KIND_LABEL].toLowerCase()).join(' or ')}]`) : o}
                </button>
              ))}
          {!p.options.length && <p className="hint">Nothing left to draw here.</p>}
        </div>
      </div>
    </div>
  )
}

function Card({ n, ox, oy, focus }: { n: LoreNode; ox: number; oy: number; focus: (id: string) => void }) {
  const s = useLore()
  const drag = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null)
  return (
    <article className={`lnode lk-${n.kind}`} id={`lore-${n.id}`} style={{ left: n.x - ox, top: n.y - oy }}>
      <header
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { sx: e.clientX, sy: e.clientY, x: n.x, y: n.y } }}
        onPointerMove={(e) => { const d = drag.current; if (d) s.move(n.id, d.x + e.clientX - d.sx, d.y + e.clientY - d.sy) }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
      >
        <small>{KIND_LABEL[n.kind]}</small>
        <b>{title(n)}</b>
        {n.emblem && <i>Emblem: {n.emblem}</i>}
      </header>
      <ul>
        {n.details.map((d, di) => (
          <li key={di}>
            {(() => { let li = 0; return detailParts(d).map((part, i) => {
              if (typeof part === 'string') return <span key={i}>{part}</span>
              const index = li++
              if (!part.primary) return <button key={i} className="ref todo" onClick={() => s.completeLink(n.id, di, index)}>choose…</button>
              if (part.node && s.web[part.node]) return <button key={i} className={`ref on lk-${part.kind}`} onClick={() => focus(part.node!)}>{refText(part, s.web)}</button>
              return <button key={i} className={`ref lk-${part.kind}`} title="Expand into its own element" onClick={() => s.expand(n.id, di, index)}>{refText(part, s.web)} +</button>
            }) })()}
            <button className="x" aria-label="Remove detail" onClick={() => s.removeDetail(n.id, di)}>×</button>
          </li>
        ))}
        {!n.details.length && <li className="hint">No details yet.</li>}
      </ul>
      <footer>
        {n.details.length < 4 && <button className="primary" onClick={() => s.addDetail(n.id)}>+ Detail</button>}
        {s.packs.names && <button onClick={() => s.drawName(n.id)}>Name</button>}
        {s.packs.emblems && <button onClick={() => s.drawEmblem(n.id)}>Emblem</button>}
        <button aria-label="Remove element" onClick={() => (!n.details.length || confirm(`Remove ${title(n)}?`)) && s.remove(n.id)}>×</button>
      </footer>
    </article>
  )
}

function Chronicle({ onClose }: { onClose: () => void }) {
  const web = useLore((s) => s.web)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(webText(web)); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { alert('Copying is not available here — select the text instead.') }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Lore</h2>
          <span className="actions"><button onClick={copy}>{copied ? 'Copied' : 'Copy text'}</button><button onClick={onClose}>Close</button></span>
        </header>
        <div className="prose">
          {Object.values(web).map((n) => (
            <section key={n.id}>
              <h3>{title(n)} <small>{KIND_LABEL[n.kind]}</small></h3>
              <p>{describeNode(n, web) || 'Nothing is known of it yet.'}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Lore() {
  const s = useLore()
  const [size, setSize] = useState(8)
  const [reading, setReading] = useState(false)
  const nodes = Object.values(s.web)
  const ox = Math.min(0, ...nodes.map((n) => n.x)) - PAD
  const oy = Math.min(0, ...nodes.map((n) => n.y)) - PAD
  const w = Math.max(0, ...nodes.map((n) => n.x)) - ox + NODE.w + PAD
  const h = Math.max(0, ...nodes.map((n) => n.y)) - oy + 320
  const focus = (id: string) => document.getElementById(`lore-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  const generate = () => { if (!nodes.length || confirm('Replace the current web with a new one?')) s.generate(size) }

  const edges = nodes.flatMap((n) => n.details.flatMap((d) => d.links.filter((l) => l.node && s.web[l.node]).map((l) => ({ from: n, to: s.web[l.node!], kind: l.kind! }))))

  return (
    <div className="app">
      <header className="topbar">
        <ToolNav />
        <div className="guide">
          <select value={size} onChange={(e) => setSize(+e.target.value)} aria-label="Web size">
            {[5, 8, 12, 16].map((n) => <option key={n} value={n}>{n} elements</option>)}
          </select>
          <button className="primary" onClick={generate}>Generate web</button>
        </div>
        <div className="chips" role="group" aria-label="Optional packs">
          {(Object.keys(PACK_LABEL) as (keyof Packs)[]).map((k) => (
            <button key={k} className={s.packs[k] ? 'on' : ''} aria-pressed={s.packs[k]} onClick={() => s.togglePack(k)}>{PACK_LABEL[k]}</button>
          ))}
        </div>
        <div className="spacer" />
        {nodes.length > 0 && <button onClick={() => setReading(true)}>Read</button>}
        {nodes.length > 0 && <button onClick={() => confirm('Clear the whole web?') && s.reset()}>New web</button>}
      </header>
      <div className="lore">
        <div className="lore-add">
          <span>Add</span>
          {kindsFor(s.packs).map((k) => <button key={k} className={`step lk-${k} on`} onClick={() => s.start(k)}>{KIND_LABEL[k]}</button>)}
        </div>
        <div className="lore-scroll">
          {nodes.length ? (
            <div className="lore-canvas" style={{ width: w, height: h }}>
              <svg width={w} height={h}>
                {edges.map((e, i) => (
                  <line key={i} className={`lk-${e.kind}`} x1={e.from.x - ox + NODE.cx} y1={e.from.y - oy + NODE.cy} x2={e.to.x - ox + NODE.cx} y2={e.to.y - oy + NODE.cy} />
                ))}
              </svg>
              {nodes.map((n) => <Card key={n.id} n={n} ox={ox} oy={oy} focus={focus} />)}
            </div>
          ) : (
            <div className="lore-empty">
              <h2>An empty web</h2>
              <p>Add a first element above — a Faction is a good place to start — or press <b>Generate web</b>. Give it details, then expand the links in them into elements of their own.</p>
            </div>
          )}
        </div>
      </div>
      <Picker />
      {reading && <Chronicle onClose={() => setReading(false)} />}
    </div>
  )
}
