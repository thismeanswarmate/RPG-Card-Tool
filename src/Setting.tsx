import { useEffect, useState } from 'react'
import { allowHint, isDirect } from './comfy'
import { ART, imageIds, imageSpec } from './imagePrompts'
import { useImages } from './imageStore'
import { titleCase } from './names'
import {
  charText, DEFAULT_ANSWERS, entityText, hookText, placeView, QUESTIONS, rootsOf, settingMarkdown, summary, tiesTo, worldProse,
  type Answers, type Char, type Entity, type Setting as SettingData, type Spot,
} from './setting'
import { SettingMap } from './SettingMap'
import { useSettings } from './settingStore'
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
  const setArt = useSettings((x) => x.setArt)
  // The fold opens by itself when there is something to report, and otherwise stays as the user left it.
  const [open, setOpen] = useState(false)
  useEffect(() => { if (im.status !== 'idle' || im.queue.length > 0) setOpen(true) }, [im.status, im.queue.length])
  const have = imageIds(s).filter((id) => im.links[`${s.id}:${id}`])
  const jobs = (ids: string[]) => ids.map((id) => ({ key: `${s.id}:${id}`, label: s.names[id], ...imageSpec(s, id) }))
  const all = () => im.add(jobs(missing))
  const redo = () => { if (confirm(`Replace all ${have.length} pictures with new ones in this art direction?`)) im.add(jobs(have)) }
  return (
    <details className="images" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Pictures <small>{im.message || 'Made on your own computer with ComfyUI'}</small></summary>
      <div className="images-body">
        <label>Art direction
          <select value={s.art ?? 'auto'} onChange={(e) => setArt(e.target.value)}>
            {Object.entries(ART).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
          </select>
        </label>
        <p className="hint">Applies to pictures made from now on. Example: “{imageSpec(s, 'world').prompt.split('. ').slice(-3, -1).join('. ')}.”</p>
        <label>ComfyUI address <input value={im.url} onChange={(e) => im.setUrl(e.target.value)} spellCheck={false} /></label>
        <label>Steps <input type="number" min={4} max={60} value={im.steps} onChange={(e) => im.setSteps(+e.target.value)} /></label>
        <div className="actions">
          <button onClick={im.test} disabled={!!active}>Test connection</button>
          <button className="primary" onClick={all} disabled={!missing.length}>
            {im.status === 'busy' || im.status === 'error' ? 'Resume' : `Make all missing pictures (${missing.length})`}
          </button>
          {have.length > 0 && !active && <button onClick={redo}>Redo all in this direction ({have.length})</button>}
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

/** A power, thing or event, with whatever hangs from it nested beneath. */
function EntityBlock({ e, s, children }: { e: Entity; s: SettingData; children?: React.ReactNode }) {
  return (
    <section id={`set-${e.id}`} className={`entry nested lk-${e.kind}`}>
      <h5><Name id={e.id} s={s} /> <small>{e.kind === 'deity' ? e.what : `${e.kind} · ${e.what}`}</small></h5>
      <Picture id={e.id} s={s} />
      <div className="prose">{entityText(s, e).map((t, i) => <p key={i}>{t}</p>)}</div>
      <Refs label="Tied to" ids={tiesTo(s, e.id)} s={s} />
      {children}
    </section>
  )
}

function PersonBlock({ c, s }: { c: Char; s: SettingData }) {
  return (
    <section id={`set-${c.id}`} className="entry nested lk-figure">
      <h5><Name id={c.id} s={s} /> <small>{c.what}</small></h5>
      <Picture id={c.id} s={s} />
      <div className="prose">{charText(s, c).map((t, i) => <p key={i}>{t}</p>)}</div>
      <Refs label="Tied to" ids={tiesTo(s, c.id).filter((id) => id !== c.faction)} s={s} />
    </section>
  )
}

/** Everything found at one spot: factions with their people and things beneath them, then the rest. */
function SpotBody({ sp, s }: { sp: Spot; s: SettingData }) {
  return (
    <>
      {sp.powers.map((p) => (
        <EntityBlock key={p.power.id} e={p.power} s={s}>
          {p.members.map((c) => <PersonBlock key={c.id} c={c} s={s} />)}
          {p.things.map((e) => <EntityBlock key={e.id} e={e} s={s} />)}
        </EntityBlock>
      ))}
      {sp.things.map((e) => <EntityBlock key={e.id} e={e} s={s} />)}
      {sp.people.map((c) => <PersonBlock key={c.id} c={c} s={s} />)}
    </>
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
      <SettingMap s={s} />
      <nav className="gaz-nav">
        {rootsOf(s).map((r) => <button key={r} onClick={() => go(r)}>{s.names[r]}</button>)}
      </nav>

      <section className="prose">
        <h3>Overview</h3>
        {meta.text.map((t, i) => <p key={i}>{t}</p>)}
        {meta.prompts.length > 0 && <ul>{meta.prompts.map((t, i) => <li key={i}>{t}</li>)}</ul>}
      </section>

      {rootsOf(s).map((r) => {
        const v = placeView(s, r)
        return (
          <article key={r} id={`set-${r}`} className="entry place">
            <h4><Name id={r} s={s} /> <small>{v.aka}</small></h4>
            <Picture id={r} s={s} />
            <div className="prose"><p>{v.land.text}</p></div>
            <SpotBody sp={v.land} s={s} />
            {v.sites.map((site) => (
              <section key={site.id} id={`set-${site.id}`} className="entry nested site">
                <h5><Name id={site.id} s={s} /> <small>site</small></h5>
                <div className="prose"><p>{site.text}</p></div>
                <SpotBody sp={site} s={s} />
              </section>
            ))}
            <Refs label="Also living here" ids={v.visitors.map((c) => c.id)} s={s} />
            {v.todo.length > 0 && <ul className="todo">{v.todo.map((t, i) => <li key={i}>{t}</li>)}</ul>}
          </article>
        )
      })}

      <details className="images">
        <summary>All stories <small>{s.hooks.length} under way</small></summary>
        <ul className="todo stories">
          {s.hooks.map((h) => <li key={h.id}>{hookText(s, h)} <button className="link" onClick={() => go(h.lines[0].who)}>({s.names[h.at]})</button></li>)}
        </ul>
      </details>
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
