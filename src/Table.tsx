import { useEffect, useMemo, useRef, useState } from 'react'
import { CardView } from './CardView'
import { DIR, dropTarget, layout, peek, SIZE } from './logic'
import { cardsOf, useStore, viewport } from './store'
import type { Edge } from './types'

interface Drag { id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
interface Pan { sx: number; sy: number; ox: number; oy: number; moved: boolean }

export function Table() {
  const s = useStore()
  const cards = cardsOf(s)
  const pos = useMemo(() => layout(s.placed, cards), [s.placed, cards])
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const pan = useRef<Pan | null>(null)
  const lastClick = useRef({ id: '', t: 0 })
  const [target, setTarget] = useState<{ hub: string; edge: Edge } | null>(null)

  useEffect(() => {
    const el = ref.current!
    const fit = () => { viewport.w = el.clientWidth; viewport.h = el.clientHeight }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const order = Object.keys(pos).sort((a, b) => pos[a].z - pos[b].z)

  /** Centre of the visible part of a card, for drawing links. */
  const anchor = (id: string) => {
    const p = s.placed[id]
    let { x, y } = pos[id]
    x += SIZE / 2
    y += SIZE / 2
    if (p.parent && p.edge !== undefined) {
      const off = SIZE / 2 - peek(cards[id]) / 2
      x += DIR[p.edge][0] * off
      y += DIR[p.edge][1] * off
    }
    return { x, y }
  }

  const click = (id: string) => {
    const now = Date.now()
    if (s.linking && s.linking !== id) s.addLink(s.linking, id)
    else if (lastClick.current.id === id && now - lastClick.current.t < 350) s.rotate(id)
    s.select(id)
    lastClick.current = { id, t: now }
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (d) {
      const dx = (e.clientX - d.sx) / s.view.k
      const dy = (e.clientY - d.sy) / s.view.k
      if (!d.moved && Math.hypot(dx, dy) * s.view.k < 5) return
      s.move(d.id, d.ox + dx, d.oy + dy, !d.moved)
      d.moved = true
      const st = useStore.getState()
      setTarget(dropTarget(st.placed, cards, layout(st.placed, cards), d.id))
    } else if (pan.current) {
      const p = pan.current
      p.moved = true
      s.setView({ ...s.view, x: p.ox + e.clientX - p.sx, y: p.oy + e.clientY - p.sy })
    }
  }

  const onUp = () => {
    const d = drag.current
    if (d) {
      if (!d.moved) click(d.id)
      else if (target) s.tuck(d.id, target.hub, target.edge)
    } else if (pan.current && !pan.current.moved) {
      s.select(null)
      s.startLink(null)
    }
    drag.current = null
    pan.current = null
    setTarget(null)
  }

  const onWheel = (e: React.WheelEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    const k = Math.min(2, Math.max(0.3, s.view.k * Math.exp(-e.deltaY * 0.0015)))
    const f = k / s.view.k
    s.setView({ k, x: mx - (mx - s.view.x) * f, y: my - (my - s.view.y) * f })
  }

  const hint = target && pos[target.hub]

  return (
    <div
      ref={ref}
      className={`table${s.linking ? ' linking' : ''}`}
      onPointerDown={(e) => {
        ref.current!.setPointerCapture(e.pointerId)
        pan.current = { sx: e.clientX, sy: e.clientY, ox: s.view.x, oy: s.view.y, moved: false }
      }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onWheel={onWheel}
    >
      <div className="world" style={{ transform: `translate(${s.view.x}px, ${s.view.y}px) scale(${s.view.k})` }}>
        {order.map((id, z) => {
          const p = s.placed[id]
          return (
            <div
              key={id}
              className="slot"
              data-card={id}
              style={{ left: pos[id].x, top: pos[id].y, zIndex: z + 1 }}
              onPointerDown={(e) => {
                e.stopPropagation()
                ref.current!.setPointerCapture(e.pointerId)
                drag.current = { id, sx: e.clientX, sy: e.clientY, ox: pos[id].x, oy: pos[id].y, moved: false }
              }}
            >
              <CardView def={cards[id]} active={p.active} edge={p.parent ? p.edge : undefined} selected={s.selected === id} />
            </div>
          )
        })}
        {hint && target && (
          <div
            className={`drop-hint e${target.edge}`}
            style={{ left: hint.x + DIR[target.edge][0] * (SIZE / 2 + 6), top: hint.y + DIR[target.edge][1] * (SIZE / 2 + 6) }}
          />
        )}
        <svg className="links">
          {s.links.map((l) => {
            if (!pos[l.a] || !pos[l.b]) return null
            const a = anchor(l.a)
            const b = anchor(l.b)
            return (
              <g key={l.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                <circle cx={a.x} cy={a.y} r={5} />
                <circle cx={b.x} cy={b.y} r={5} />
                {l.note && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6}>{l.note}</text>}
              </g>
            )
          })}
        </svg>
      </div>
      {!order.length && !s.hand.length && (
        <div className="empty">
          <h2>An empty table</h2>
          <p>Press <b>Draw</b> in the guide above to start your first microsetting, or draw any card from the piles on the left.</p>
        </div>
      )}
      {s.linking && <div className="toast">Click another card to link it — or click the table to cancel.</div>}
      <div className="zoom">
        <button onClick={() => s.setView({ ...s.view, k: Math.min(2, s.view.k * 1.2) })}>+</button>
        <button onClick={() => s.setView({ ...s.view, k: Math.max(0.3, s.view.k / 1.2) })}>−</button>
        <button onClick={() => s.setView({ x: 0, y: 0, k: 1 })} title="Reset view">⌂</button>
      </div>
    </div>
  )
}
