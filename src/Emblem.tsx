import { useId, useRef } from 'react'
import { BORDERS, COLOURS, emblemFrom, emblemWords, ICONS, LAYOUTS, PATTERNS, SHAPES, tidy, type EmblemSpec } from './emblem'

const DARK = '#1a1c21'

/** The second colour laid over the field, for each pattern, in the emblem's 100 by 100 box. */
function Field({ pattern, fill, shape, base }: { pattern: number; fill: string; shape: string; base: string }) {
  const stripes = (n: number, across: boolean) => Array.from({ length: Math.ceil(n / 2) }, (_, i) => {
    const at = (100 / n) * (i * 2 + 1)
    return across ? <rect key={i} x="0" y={at} width="100" height={100 / n} /> : <rect key={i} x={at} y="0" width={100 / n} height="100" />
  })
  const wedges = (n: number) => Array.from({ length: n / 2 }, (_, i) => {
    const a0 = (Math.PI * 2 * (i * 2)) / n, a1 = (Math.PI * 2 * (i * 2 + 1)) / n
    return <path key={i} d={`M50 50L${50 + 90 * Math.sin(a0)} ${50 - 90 * Math.cos(a0)}L${50 + 90 * Math.sin(a1)} ${50 - 90 * Math.cos(a1)}z`} />
  })
  const parts: Record<number, React.ReactNode> = {
    1: <rect x="50" y="0" width="50" height="100" />,
    2: <rect x="0" y="50" width="100" height="50" />,
    3: <path d="M0 0H100V100z" />,
    4: <path d="M0 0H100L0 100z" />,
    5: <><rect x="50" y="0" width="50" height="50" /><rect x="0" y="50" width="50" height="50" /></>,
    6: <rect x="36" y="0" width="28" height="100" />,
    7: <rect x="0" y="36" width="100" height="28" />,
    8: <path d="M0 0H22L100 78V100H78L0 22z" />,
    9: <rect x="0" y="0" width="100" height="32" />,
    10: <path d="M0 72L50 32 100 72V92L50 52 0 92z" />,
    11: <>{stripes(6, false)}</>,
    12: <>{stripes(6, true)}</>,
    13: <g transform="rotate(45 50 50)">{Array.from({ length: 5 }, (_, i) => <rect key={i} x={-34 + i * 36} y="-40" width="18" height="180" />)}</g>,
    14: <>{Array.from({ length: 16 }, (_, i) => ((i + Math.floor(i / 4)) % 2 ? <rect key={i} x={(i % 4) * 25} y={Math.floor(i / 4) * 25} width="25" height="25" /> : null))}</>,
    15: <><rect x="40" y="0" width="20" height="100" /><rect x="0" y="40" width="100" height="20" /></>,
    16: <><rect x="42" y="-30" width="16" height="160" transform="rotate(45 50 50)" /><rect x="42" y="-30" width="16" height="160" transform="rotate(-45 50 50)" /></>,
    17: <>{wedges(8)}</>,
    18: <>{wedges(20)}</>,
    // The whole field takes the second colour, and a smaller copy of the shape keeps the first.
    19: <><rect x="0" y="0" width="100" height="100" /><path d={shape} fill={base} transform="translate(50 50) scale(.72) translate(-50 -50)" /></>,
    20: <path d="M0 100V72c16-12 34-12 50 0s34 12 50 0v28z" />,
    21: <path d="M14 0H86L50 82z" />,
    22: <circle cx="50" cy="52" r="27" />,
    23: <>{Array.from({ length: 30 }, (_, i) => { const row = Math.floor(i / 5), x = (i % 5) * 22 + (row % 2 ? 0 : 11) - 6, y = row * 16 + 4; return <path key={i} d={`M${x} ${y}a11 11 0 0 0 22 0z`} opacity=".85" /> })}</>,
    24: <>{Array.from({ length: 13 }, (_, i) => { const row = Math.floor(i / 2.6), x = [25, 50, 75, 12.5, 37.5, 62.5, 87.5, 25, 50, 75, 12.5, 37.5, 62.5][i] ?? 50, y = [18, 18, 18, 40, 40, 40, 40, 62, 62, 62, 84, 84, 84][i] ?? 50; void row; return <path key={i} d={`M${x} ${y - 11}l9 11-9 11-9-11z`} /> })}</>,
  }
  return <g fill={fill}>{parts[pattern] ?? null}</g>
}

/** Where each copy of the icon sits and how large it is, for each layout. */
const SPOTS: [number, number, number][][] = [
  [[50, 51, 46]],
  [[31, 36, 24], [69, 36, 24], [50, 66, 24]],
  [[50, 33, 28], [50, 67, 28]],
]

interface Props { spec: EmblemSpec; size?: number; title?: string; svgRef?: React.Ref<SVGSVGElement>; /** Where its top left corner goes, when it is drawn inside a larger picture such as the map. */ x?: number; y?: number }

/** An emblem drawn from its spec. With a title it is announced by name; without, it is decoration. */
export function Emblem({ spec, size = 28, title, svgRef, x, y }: Props) {
  const s = tidy(spec)
  const id = useId().replace(/:/g, '')
  const [, shape] = SHAPES[s.shape]
  const [a, b, c] = [COLOURS[s.a][1], COLOURS[s.b][1], COLOURS[s.c][1]]
  const [, d, mode] = ICONS[s.icon]
  const inset = 'translate(50 50) scale(.86) translate(-50 -50)'
  // A dark or light edge round the icon, whichever it is not, so it holds against any field.
  const halo = s.c >= 12 ? DARK : '#f3efe4'
  return (
    <svg ref={svgRef} className="emblem" x={x} y={y} width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}>
      {title && <title>{title}</title>}
      <clipPath id={`e${id}`}><path d={shape} /></clipPath>
      <g clipPath={`url(#e${id})`}>
        <rect x="0" y="0" width="100" height="100" fill={a} />
        <Field pattern={s.pattern} fill={b} shape={shape} base={a} />
        {SPOTS[s.layout].map(([x, y, w], i) => (
          <g key={i} transform={`translate(${x - w / 2} ${y - w / 2}) scale(${w / 24})`} strokeLinecap="round" strokeLinejoin="round">
            <path d={d} fill={mode === 'f' ? halo : 'none'} stroke={halo} strokeWidth={mode === 'f' ? 2.4 : 4.6} />
            <path d={d} fill={mode === 'f' ? c : 'none'} stroke={mode === 'f' ? 'none' : c} strokeWidth="2.2" />
          </g>
        ))}
        {(s.border === 1 || s.border === 6) && <path d={shape} fill="none" stroke={b === a ? c : b} strokeWidth="14" />}
        {s.border === 2 && <path d={shape} fill="none" stroke={DARK} strokeWidth="1.6" transform={inset} />}
        {s.border === 3 && <path d={shape} fill="none" stroke={c} strokeWidth="2" strokeDasharray="6 4" transform={inset} />}
        {s.border === 4 && <path d={shape} fill="none" stroke={c} strokeWidth="2.6" strokeDasharray="0.1 5" strokeLinecap="round" transform={inset} />}
        {s.border === 6 && <path d={shape} fill="none" stroke={DARK} strokeWidth="1.4" transform={inset} />}
      </g>
      {s.border !== 7 && <path d={shape} fill="none" stroke={DARK} strokeWidth={s.border === 5 ? 6 : 3} strokeLinejoin="round" />}
    </svg>
  )
}

/** The parts of an emblem as lists and swatches, with the result shown large beside them. */
export function EmblemEditor({ spec, onChange, name }: { spec: EmblemSpec; onChange(next: EmblemSpec): void; name?: string }) {
  const s = tidy(spec)
  const ref = useRef<SVGSVGElement>(null)
  const set = (patch: Partial<EmblemSpec>) => onChange({ ...s, ...patch })
  const list = (label: string, key: keyof EmblemSpec, options: string[]) => (
    <label className="pick">{label}
      <select value={s[key]} onChange={(e) => set({ [key]: +e.target.value })}>{options.map((o, i) => <option key={i} value={i}>{o}</option>)}</select>
    </label>
  )
  const swatches = (label: string, key: 'a' | 'b' | 'c') => (
    <div className="swatches" role="group" aria-label={label}>
      <span>{label}</span>
      {COLOURS.map(([n, hex], i) => <button key={i} title={n} aria-label={n} aria-pressed={s[key] === i} className={s[key] === i ? 'on' : ''} style={{ background: hex }} onClick={() => set({ [key]: i })} />)}
    </div>
  )
  const save = () => {
    if (!ref.current) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ref.current.outerHTML.replace(/width="\d+" height="\d+"/, 'width="512" height="512"')], { type: 'image/svg+xml' }))
    a.download = `${(name ?? 'emblem').replace(/\W+/g, '-').toLowerCase()}.svg`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="emblem-editor">
      <div className="emblem-big">
        <Emblem spec={s} size={168} title={name ? `Emblem of ${name}` : 'Emblem'} svgRef={ref} />
        <p className="hint">{emblemWords(s).replace(/^./, (ch) => ch.toUpperCase())}.</p>
        <div className="actions">
          <button className="primary" onClick={() => onChange(emblemFrom(String(Math.random())))}>Randomise</button>
          <button onClick={save}>Save as SVG</button>
        </div>
      </div>
      <div className="emblem-parts">
        {list('Shape', 'shape', SHAPES.map((x) => x[0]))}
        {list('Field', 'pattern', PATTERNS)}
        {list('Border', 'border', BORDERS)}
        {list('Icon', 'icon', ICONS.map((x) => x[0]))}
        {list('Arrangement', 'layout', LAYOUTS)}
        {swatches('Field colour', 'a')}
        {swatches('Second colour', 'b')}
        {swatches('Icon colour', 'c')}
      </div>
    </div>
  )
}
