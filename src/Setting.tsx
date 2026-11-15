import { useEffect, useState } from 'react'
import { EXPANSION_COLORS } from './expansions'
import { allowHint, isDirect } from './comfy'
import { imageIds, imageSpec } from './imagePrompts'
import { useImages } from './imageStore'
import { titleCase } from './names'
import {
  charText, DEFAULT_ANSWERS, entityText, homeRoot, hookText, KIND_ORDER, placeView, QUESTIONS, rootsOf, settingMarkdown, summary, terrainOf, tiesTo, worldProse,
  type Answers, type Setting as SettingData,
} from './setting'
import { useSettings } from './settingStore'
import { TERRAIN_COLORS } from './starter'
import { ToolNav } from './ToolNav'

const upper = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const go = (id: string) => document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const WORDS = 'ember harbour thistle lantern marrow sable quill tallow wren ash juniper flint'.split(' ')
const randomSeed = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(100 + Math.random() * 900)}`

function Questions() {
  const create = useSettings((s) => s.create)
  const [a, setA] = useState<Answers>(DEFAULT_ANSWERS)
  const [seed, setSeed] = useState('')
  const toggle = (key: 'genres' | 'lands' | 'focus', v: string) =>
    setA({ ...a, [key]: a[key].includes(v) ? a[key].filter((x) => x !== v) : [...a[key], v] })
  const group = (key: keyof typeof QUESTIONS, multi: boolean) => (
    <fieldset className="question">
      <legend>{QUESTIONS[key].label}{multi && <small> Pick any that apply</small>}</legend>
      <div className="chips">
        {Object.entries(QUESTIONS[key].options).map(([v, label]) => {
          const on = multi ? (a[key] as string[]).includes(v) : a[key] === v
          return (
            <button key={v} className={on ? 'on' : ''} aria-pressed={on}
              onClick={() => (multi ? toggle(key as 'genres', v) : setA({ ...a, [key]: v }))}>{label}</button>
          )
        })}
      </div>
    </fieldset>
  )
  return (
    <div className="wizard">
      <h2>A new setting</h2>
      <p className="hint">
        Answer five questions and get one connected setting: a map of named places, the powers at work in it, the people who live there
        and the stories waiting to happen. Each part refers to the others.
      </p>
      {group('size', false)}
      {group('genres', true)}
      {group('lands', true)}
      {group('focus', true)}
      {group('depth', false)}
      <fieldset className="question">
        <legend>Seed <small>Optional. The same seed and answers always give the same setting.</small></legend>
        <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Leave empty for a random one" />
      </fieldset>
      <button className="primary big" onClick={() => create(a, seed.trim() || randomSeed())}>Generate setting</button>
    </div>
  )
}

/** A name with the two ways to change it: draw another, or type your own. */
function Name({ id, s }: { id: string; s: SettingData }) {
  const rename = useSettings((x) => x.rename)
  const edit = () => { const v = prompt('Name', s.names[id]); if (v !== null) rename(id, v) }
  return (
    <>
      {id === 'world' ? titleCase(upper(s.names[id])) : upper(s.names[id])}
      <span className="rename">
        <button title="Draw another name" aria-label="Draw another name" onClick={() => rename(id)}>↻</button>
        <button title="Type a name" aria-label="Type a name" onClick={edit}>✎</button>
      </span>
    </>
  )
}

/** ComfyUI connection, the batch button and progress, tucked into one fold at the top of a setting. */
function ImagePanel({ s }: { s: SettingData }) {
  const im = useImages()
  const missing = imageIds(s).filter((id) => !im.links[`${s.id}:${id}`])
  const active = im.status === 'working' && (im.current || im.queue.length > 0)
  const all = () => im.add(missing.map((id) => ({ key: `${s.id}:${id}`, label: s.names[id], ...imageSpec(s, id) })))
  return (
    <details className="images" open={im.status !== 'idle' || im.queue.length > 0}>
      <summary>Pictures <small>{im.message || 'Made on your own computer with ComfyUI'}</small></summary>
      <div className="images-body">
        <label>ComfyUI address <input value={im.url} onChange={(e) => im.setUrl(e.target.value)} spellCheck={false} /></label>
        <label>Steps <input type="number" min={4} max={60} value={im.steps} onChange={(e) => im.setSteps(+e.target.value)} /></label>
        <div className="actions">
          <button onClick={im.test} disabled={!!active}>Test connection</button>
          <button className="primary" onClick={all} disabled={!missing.length}>
            {im.status === 'busy' || im.status === 'error' ? 'Resume' : `Make all missing pictures (${missing.length})`}
          </button>
          {(active || im.queue.length > 0) && <button onClick={im.cancel}>Stop</button>}
        </div>
        {(im.current || im.queue.length > 0) && <p className="hint">{im.queue.length} waiting{im.current ? `, one in progress (${im.current.label})` : ''}. Each picture takes a few minutes.</p>}
        <p className="hint">
          Pictures are made by ComfyUI running on this computer and are kept in this browser. One is made at a time, nothing is sent while
          ComfyUI has other work, and its memory is freed when the batch ends.
        </p>
        <p className="hint">
          {isDirect(im.url)
            ? <>This page talks to ComfyUI directly, so ComfyUI has to be told to accept it. {allowHint()} For ComfyUI on this computer the address starts with http://; a secure address that forwards to it, such as one from a private network, starts with https://.</>
            : <>Requests go through this app’s own server, so ComfyUI needs no changes.</>}
        </p>
      </div>
    </details>
  )
}

/** The picture for one element, with the buttons to make, redo, save or remove it. */
function Picture({ id, s }: { id: string; s: SettingData }) {
  const im = useImages()
  const key = `${s.id}:${id}`
  const src = im.links[key]
  const waiting = im.current?.key === key || im.queue.some((j) => j.key === key)
  const [editing, setEditing] = useState<string | null>(null)
  const spec = imageSpec(s, id)
  const make = (prompt = spec.prompt, fresh = false) =>
    im.add([{ key, label: s.names[id], ...spec, prompt, seed: fresh ? Math.floor(Math.random() * 2 ** 31) : spec.seed }])
  return (
    <div className="picture">
      {src && <img src={src} alt={`Picture of ${s.names[id]}`} loading="lazy" />}
      <div className="pic-actions">
        {waiting ? <span className="hint">{im.current?.key === key ? 'Making the picture…' : 'Waiting its turn…'}</span> : (
          <>
            <button onClick={() => make(spec.prompt, !!src)}>{src ? 'New picture' : 'Make picture'}</button>
            <button onClick={() => setEditing(spec.prompt)}>Edit prompt…</button>
            {src && <a className="button" href={src} download={`${s.names[id].replace(/\W+/g, '-').toLowerCase()}.png`}>Save</a>}
            {src && <button onClick={() => im.remove(key)}>Remove</button>}
          </>
        )}
      </div>
      {editing !== null && (
        <div className="modal-back" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header><h2>Prompt for {s.names[id]}</h2><button onClick={() => setEditing(null)}>Cancel</button></header>
            <p className="hint">Describe the subject, then the setting, then the light, then the medium. Invented names are best left out.</p>
            <textarea className="prompt" value={editing} onChange={(e) => setEditing(e.target.value)} />
            <div className="actions"><button className="primary" disabled={!editing.trim()} onClick={() => { make(editing.trim(), true); setEditing(null) }}>Make picture</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

const Refs = ({ label, ids, s }: { label: string; ids: string[]; s: SettingData }) =>
  ids.length ? (
    <p className="refs">
      <span>{label}</span>
      {ids.map((id) => <button key={id} className="link" onClick={() => go(id)}>{s.names[id]}</button>)}
    </p>
  ) : null

function Map({ s }: { s: SettingData }) {
  const roots = rootsOf(s)
  const k = 0.3
  const xs = roots.map((r) => s.board[r].x * k)
  const ys = roots.map((r) => s.board[r].y * k)
  const [x0, y0] = [Math.min(...xs) - 10, Math.min(...ys) - 10]
  const [w, h] = [Math.max(...xs) - x0 + 160, Math.max(...ys) - y0 + 84]
  return (
    <svg className="map" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w * 1.4 }} role="img" aria-label="Map of the setting">
      <defs>
        {roots.map((r) => {
          const [a, b] = TERRAIN_COLORS[terrainOf(s, r)] ?? EXPANSION_COLORS[terrainOf(s, r)] ?? ['#667', '#445']
          return <linearGradient key={r} id={`g-${r}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
        })}
      </defs>
      {roots.map((r) => (
        <g key={r} transform={`translate(${s.board[r].x * k - x0}, ${s.board[r].y * k - y0})`} onClick={() => go(r)}>
          <rect width="150" height="74" rx="10" fill={`url(#g-${r})`} />
          <text x="75" y="33" className="map-name">{s.names[r]}</text>
          <text x="75" y="52" className="map-kind">{terrainOf(s, r)}</text>
        </g>
      ))}
    </svg>
  )
}

function Gazetteer({ s }: { s: SettingData }) {
  const [copied, setCopied] = useState(false)
  const meta = worldProse(s)
  const load = useImages((x) => x.load)
  useEffect(() => { void load(`${s.id}:`) }, [s.id, load])
  const copy = async () => {
    try { await navigator.clipboard.writeText(settingMarkdown(s)); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { alert('Copying is not available here — use Download instead.') }
  }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([settingMarkdown(s)], { type: 'text/markdown' }))
    a.download = `${s.names.world.replace(/^the /, '').replace(/\W+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="gazetteer">
      <header className="gaz-head">
        <h2><Name id="world" s={s} /></h2>
        <p className="hint">{summary(s)} · seed “{s.seed}”</p>
        <div className="actions">
          <button onClick={copy}>{copied ? 'Copied' : 'Copy as text'}</button>
          <button onClick={download}>Download</button>
        </div>
      </header>
      <ImagePanel s={s} />
      <Picture id="world" s={s} />
      <Map s={s} />
      <nav className="gaz-nav">
        {['Places', 'Powers', 'People', 'Stories'].map((t) => <button key={t} onClick={() => go(t)}>{t}</button>)}
      </nav>

      {meta && (
        <section className="prose">
          <h3>Across the world</h3>
          {meta.text.map((t, i) => <p key={i}>{t}</p>)}
          {meta.prompts.length > 0 && <ul>{meta.prompts.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        </section>
      )}

      <h3 className="gz-band" id="set-Places">Places</h3>
      {rootsOf(s).map((r) => {
        const v = placeView(s, r)
        return (
          <article key={r} id={`set-${r}`} className="entry">
            <h4><Name id={r} s={s} /> <small>{v.aka}</small></h4>
            <Picture id={r} s={s} />
            <div className="prose">{v.prose.map((t, i) => <p key={i}>{t}</p>)}</div>
            {v.sites.length > 0 && (
              <p className="refs"><span>Sites</span>{v.sites.map((id) => <span key={id} id={`set-${id}`} className="named"><Name id={id} s={s} /></span>)}</p>
            )}
            <Refs label="People" ids={v.people.map((c) => c.id)} s={s} />
            <Refs label="Also here" ids={v.powers.map((e) => e.id)} s={s} />
            {(v.todo.length > 0 || v.hooks.length > 0) && (
              <ul className="todo">
                {v.hooks.map((h) => <li key={h.id}><b>Story</b> — {hookText(s, h)}</li>)}
                {v.todo.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </article>
        )
      })}

      <h3 className="gz-band" id="set-Powers">Powers and things</h3>
      {KIND_ORDER.flatMap((kind) => s.entities.filter((e) => e.kind === kind)).map((e) => (
        <article key={e.id} id={`set-${e.id}`} className={`entry lk-${e.kind}`}>
          <h4><Name id={e.id} s={s} /> <small>{e.kind === 'deity' ? e.what : `${e.kind} · ${e.what}`}</small></h4>
          <Picture id={e.id} s={s} />
          <div className="prose"><p>{entityText(s, e)}</p></div>
          {e.home && <Refs label="Where" ids={[homeRoot(s, e.home)]} s={s} />}
          <Refs label="Tied to" ids={tiesTo(s, e.id)} s={s} />
        </article>
      ))}

      <h3 className="gz-band" id="set-People">People</h3>
      {s.people.map((c) => (
        <article key={c.id} id={`set-${c.id}`} className="entry lk-figure">
          <h4><Name id={c.id} s={s} /> <small>{c.what}</small></h4>
          <Picture id={c.id} s={s} />
          <div className="prose">{charText(s, c).map((t, i) => <p key={i}>{t}</p>)}</div>
          <Refs label="Where" ids={[homeRoot(s, c.home)]} s={s} />
          <Refs label="Tied to" ids={[...(c.faction ? [c.faction] : []), ...tiesTo(s, c.id).filter((id) => id !== c.faction)]} s={s} />
        </article>
      ))}

      <h3 className="gz-band" id="set-Stories">Stories</h3>
      <ul className="todo stories">
        {s.hooks.map((h) => <li key={h.id}>{hookText(s, h)} <button className="link" onClick={() => go(h.at)}>({s.names[h.at]})</button></li>)}
      </ul>
    </div>
  )
}

export function Setting() {
  const st = useSettings()
  const removeImages = useImages((x) => x.removeAll)
  const current = st.settings.find((x) => x.id === st.current)
  return (
    <div className="app">
      <header className="topbar"><ToolNav /></header>
      <div className="setting">
        <aside className="cast">
          <h3>Settings</h3>
          {st.settings.map((x) => (
            <div key={x.id} className={`cast-row${x.id === st.current ? ' on' : ''}`}>
              <button className="cast-name" onClick={() => st.select(x.id)}>
                {titleCase(upper(x.names.world))}
                <small>{rootsOf(x).length} places · seed {x.seed}</small>
              </button>
              <button title="Delete setting" aria-label="Delete setting" onClick={() => { if (confirm(`Delete ${x.names.world} and its pictures?`)) { void removeImages(`${x.id}:`); st.remove(x.id) } }}>×</button>
            </div>
          ))}
          <button className={current ? '' : 'primary'} onClick={() => st.select(null)}>+ New setting</button>
        </aside>
        <main className="setting-main">{current ? <Gazetteer key={current.id} s={current} /> : <Questions />}</main>
      </div>
    </div>
  )
}
