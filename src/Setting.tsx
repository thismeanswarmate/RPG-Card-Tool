import { createContext, useContext, useEffect, useState } from 'react'
import { allowHint, isDirect } from './comfy'
import { ART, imageIds, imageSpec } from './imagePrompts'
import { useImages } from './imageStore'
import { KIND_LABEL, type Kind } from './lore'
import { titleCase } from './names'
import { RollRows } from './Roller'
import {
  builtKind, builtText, charText, DEFAULT_ANSWERS, entityText, hookText, placeView, QUESTIONS, rootsOf, settingMarkdown, summary, tiesTo, worldProse,
  type Answers, type Built, type Char, type Entity, type Setting as SettingData, type Spot,
} from './setting'
import {
  addBuilt, addPerson, addPlace, addPower, addSite, addStory, ASPECTS, aspectsOf, builtEdit, builtReroll, builtSteps, choices, choose, chosen,
  goneWith, redrawPlace, remove, removeStory, rerollStory, rewrite, setFaction, setWhat, whatChoices,
} from './settingBuild'
import { SettingMap } from './SettingMap'
import { useSettings } from './settingStore'
import { ToolNav } from './ToolNav'
import type { CardType } from './types'

const upper = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const go = (id: string) => document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const WORDS = 'ember harbour thistle lantern marrow sable quill tallow wren ash juniper flint'.split(' ')
const randomSeed = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(100 + Math.random() * 900)}`

function Questions({ back }: { back(): void }) {
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
      <h2>Let me build it for you</h2>
      <p className="hint">
        Answer five questions and get one connected setting: a map of named places, the powers at work in it, the people who live there,
        its settlements and dangerous places, and the stories waiting to happen. Each part refers to the others, and all of it can be changed afterwards.
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
      <div className="actions">
        <button className="primary big" onClick={() => create(a, seed.trim() || randomSeed())}>Generate setting</button>
        <button onClick={back}>Back</button>
      </div>
    </div>
  )
}

/** The two things a hand-built setting needs to know before its first place: which cards and names to draw on. */
function ManualStart({ back }: { back(): void }) {
  const create = useSettings((s) => s.createManual)
  const [genres, setGenres] = useState<string[]>(DEFAULT_ANSWERS.genres)
  const [lands, setLands] = useState<string[]>(DEFAULT_ANSWERS.lands)
  const [title, setTitle] = useState('')
  const group = (key: 'genres' | 'lands', value: string[], set: (v: string[]) => void) => (
    <fieldset className="question">
      <legend>{QUESTIONS[key].label}<small> Pick any that apply</small></legend>
      <div className="chips">
        {Object.entries(QUESTIONS[key].options).map(([v, label]) => (
          <button key={v} className={value.includes(v) ? 'on' : ''} aria-pressed={value.includes(v)}
            onClick={() => set(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])}>{label}</button>
        ))}
      </div>
    </fieldset>
  )
  return (
    <div className="wizard">
      <h2>I’ll build it</h2>
      <p className="hint">
        You add the pieces one at a time: a place, then what is found there, then the next place. These two answers decide which lands,
        sites and names the pieces are drawn from.
      </p>
      {group('genres', genres, setGenres)}
      {group('lands', lands, setLands)}
      <fieldset className="question">
        <legend>Name <small>Optional. Leave empty and one is made up; it can be changed later.</small></legend>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The name of your setting" />
      </fieldset>
      <div className="actions">
        <button className="primary big" onClick={() => create(genres, lands, title)}>Start building</button>
        <button onClick={back}>Back</button>
      </div>
    </div>
  )
}

/** The first choice for a new setting: have it generated whole, or build it piece by piece. */
function NewSetting() {
  const [mode, setMode] = useState<'auto' | 'manual' | null>(null)
  if (mode === 'auto') return <Questions back={() => setMode(null)} />
  if (mode === 'manual') return <ManualStart back={() => setMode(null)} />
  return (
    <div className="wizard">
      <h2>A new setting</h2>
      <div className="choices">
        <button className="choice" onClick={() => setMode('auto')}>
          <b>Let me build it for you</b>
          <span>Answer five questions and get a whole setting at once: places, powers, people, settlements, dangerous places and stories, all tied together. You can still change any of it afterwards.</span>
        </button>
        <button className="choice" onClick={() => setMode('manual')}>
          <b>I’ll build it</b>
          <span>Start with one place and fill it in step by step: its sites, the powers there, the people, a settlement, a danger. Then add the next place. Go back and change anything whenever you like.</span>
        </button>
      </div>
    </div>
  )
}

/** One part of a place as a list to choose from: every option in words, plus a random pick and, where it fits, none. */
function Pick({ s, root, type, label, current, optional }: { s: SettingData; root: string; type: CardType; label: string; current?: string; optional?: boolean }) {
  const edit = useSettings((x) => x.edit)
  return (
    <label className="pick">{label}
      <select value={current ? chosen(s, current) : ''} onChange={(e) => edit((d) => choose(d, root, type, e.target.value, current))}>
        {optional && <option value="">—</option>}
        {choices(s, type, current).map((c) => <option key={c.value} value={c.value}>{c.text}</option>)}
        <option value="random">Surprise me</option>
      </select>
    </label>
  )
}

/** Whether the setting on screen is being edited, which shows the buttons for adding, changing and removing. */
const EditCtx = createContext(false)

/** Add something to the setting and bring it into view. */
function useAdd() {
  const edit = useSettings((x) => x.edit)
  return (make: (s: SettingData) => string | undefined) => {
    let id: string | undefined
    edit((d) => { id = make(d) })
    if (id) setTimeout(() => go(id!), 60)
  }
}

/** Remove something after asking, along with whatever goes with it and their pictures. */
function useRemove(s: SettingData) {
  const edit = useSettings((x) => x.edit)
  const drop = useImages((x) => x.remove)
  return (id: string) => {
    const gone = goneWith(s, id).filter((g) => s.names[g])
    const others = gone.length - 1
    if (!confirm(`Remove ${s.names[id]}${others > 0 ? ` and the ${others} ${others === 1 ? 'thing' : 'things'} found there` : ''}? Mentions of ${others > 0 ? 'them' : 'it'} elsewhere go too.`)) return
    for (const g of gone) drop(`${s.id}:${g}`)
    edit((d) => remove(d, id))
  }
}

const MORE: Kind[] = ['deity', 'event', 'object', 'creature', 'material']

/** The buttons for adding to one spot: a site on the land, or powers, people and built places anywhere. */
function AddBar({ s, home, land }: { s: SettingData; home: string; land?: boolean }) {
  const add = useAdd()
  if (!useContext(EditCtx)) return null
  return (
    <div className="addbar">
      <span>Add {land ? `to ${s.names[home]}` : 'here'}</span>
      {land && <button onClick={() => add((d) => addSite(d, home))}>+ Site</button>}
      <button onClick={() => add((d) => addPower(d, 'faction', home))}>+ Faction</button>
      <button onClick={() => add((d) => addPerson(d, home))}>+ Person</button>
      <button onClick={() => add((d) => addBuilt(d, 'settlement', home))}>+ Settlement</button>
      <button onClick={() => add((d) => addBuilt(d, 'peril', home))}>+ Dangerous place</button>
      <select value="" aria-label="Add something else" onChange={(e) => { const kind = e.target.value as Kind; if (kind) add((d) => addPower(d, kind, home)) }}>
        <option value="">+ More…</option>
        {MORE.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </select>
    </div>
  )
}

/** A settlement or dangerous place inside the setting: its brief, and when editing, its tables. */
function BuiltBlock({ b, s }: { b: Built; s: SettingData }) {
  const editing = useContext(EditCtx)
  const edit = useSettings((x) => x.edit)
  const drop = useRemove(s)
  return (
    <section id={`set-${b.id}`} className={`entry nested built ${b.tool}`}>
      <h5><Name id={b.id} s={s} /> <small>{b.tool === 'settlement' ? 'settlement' : 'dangerous place'} · {builtKind(b)}</small></h5>
      <div className="prose">{builtText(s, b).map((t, i) => <p key={i}>{t}</p>)}</div>
      {editing && (
        <>
          <details className="tables">
            <summary>Tables <small>Pick, reroll or lock each result</small></summary>
            <RollRows steps={builtSteps(b)} rolls={b.rolls} locked={b.locked ?? []}
              onSet={(table, i) => edit((d) => builtEdit(d, b.id, table, i))}
              onRoll={(table) => edit((d) => builtEdit(d, b.id, table, 'roll'))}
              onLock={(table) => edit((d) => builtEdit(d, b.id, table, 'lock'))} />
          </details>
          <div className="edit-row">
            <button onClick={() => edit((d) => builtReroll(d, b.id))}>↻ Reroll unlocked</button>
            <button onClick={() => drop(b.id)}>Remove</button>
          </div>
        </>
      )}
    </section>
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
        <p className="hint">
          Applies to pictures made from now on. Whatever the direction, every picture still shows the things of this setting’s genre.
          The direction adds: “{imageSpec(s, 'world').prompt.split('. ').slice(-3, -1).join('. ')}.”
        </p>
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

/** The buttons under a power, thing or person while editing: write it again, change where a person belongs, start a story, remove. */
function EditRow({ id, s, what, person }: { id: string; s: SettingData; what: string; person?: Char }) {
  const edit = useSettings((x) => x.edit)
  const drop = useRemove(s)
  if (!useContext(EditCtx)) return null
  const factions = s.entities.filter((e) => e.kind === 'faction')
  return (
    <div className="edit-row">
      <label className="pick">{person ? 'Role' : 'Kind'}
        <select value={what} onChange={(e) => edit((d) => setWhat(d, id, e.target.value))}>
          {whatChoices(s, id).map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <button onClick={() => edit((d) => rewrite(d, id))} title="Write the details again, so they can take in what has been added since">↻ Rewrite</button>
      {person && factions.length > 0 && (
        <select value={person.faction ?? ''} aria-label="Belongs to" onChange={(e) => edit((d) => setFaction(d, id, e.target.value || undefined))}>
          <option value="">Belongs to no faction</option>
          {factions.map((f) => <option key={f.id} value={f.id}>Belongs to {s.names[f.id]}</option>)}
        </select>
      )}
      {person && <button onClick={() => edit((d) => { addStory(d, id) })}>+ Story</button>}
      <button onClick={() => drop(id)}>Remove</button>
    </div>
  )
}

/** A power, thing or event, with whatever hangs from it nested beneath. */
function EntityBlock({ e, s, children }: { e: Entity; s: SettingData; children?: React.ReactNode }) {
  return (
    <section id={`set-${e.id}`} className={`entry nested lk-${e.kind}`}>
      <h5><Name id={e.id} s={s} /> <small>{e.kind === 'deity' ? e.what : `${e.kind} · ${e.what}`}</small></h5>
      <Picture id={e.id} s={s} />
      <div className="prose">{entityText(s, e).map((t, i) => <p key={i}>{t}</p>)}</div>
      <Refs label="Tied to" ids={tiesTo(s, e.id)} s={s} />
      <EditRow id={e.id} s={s} what={e.what} />
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
      <EditRow id={c.id} s={s} what={c.what} person={c} />
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
      {sp.built.map((b) => <BuiltBlock key={b.id} b={b} s={s} />)}
      <AddBar s={s} home={sp.id} land={!s.board[sp.id]?.parent} />
    </>
  )
}

function Gazetteer({ s }: { s: SettingData }) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(!!s.manual)
  const edit = useSettings((x) => x.edit)
  const add = useAdd()
  const drop = useRemove(s)
  const roots = rootsOf(s)
  // The first place with nothing in it yet is the natural next step.
  const bare = roots.find((r) => { const v = placeView(s, r); return [v.land, ...v.sites].every((sp) => !sp.powers.length && !sp.things.length && !sp.people.length && !sp.built.length) })
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
    <EditCtx.Provider value={editing}>
    <div className="gazetteer">
      <header className="gaz-head">
        <h2><Name id="world" s={s} /></h2>
        <p className="hint">{summary(s)} · {s.manual ? 'built by hand' : `seed “${s.seed}”`}</p>
        <div className="actions">
          <button className={editing ? 'on' : ''} aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : 'Edit'}</button>
          <button onClick={copy}>{copied ? 'Copied' : 'Copy as text'}</button>
          <button onClick={download}>Download</button>
        </div>
      </header>
      {editing && (
        <section className="guide">
          <h3>{!roots.length ? 'Step 1: a place' : bare ? `Next: fill in ${s.names[bare]}` : 'Next: another place, or more detail'}</h3>
          <p>
            {!roots.length ? 'Every setting starts somewhere. Add a place and it arrives with a kind of land, a site, a name and a description, each of which you can then choose from a list.'
              : bare ? 'Use the “Add” buttons under the place to give it a faction, some people, a settlement or a danger. Whatever you add is described in terms of what is already there.'
                : 'Add the next place, or keep filling in the ones you have. “Rewrite” on anything lets it take in what you have added since, and every name can be redrawn or typed.'}
          </p>
          <div className="actions">
            <button className={!roots.length || !bare ? 'primary' : ''} onClick={() => add(addPlace)}>+ Add {roots.length ? 'another' : 'the first'} place</button>
            {bare && <button className="primary" onClick={() => go(bare)}>Go to {s.names[bare]}</button>}
          </div>
        </section>
      )}
      {roots.length > 0 && <ImagePanel s={s} />}
      {roots.length > 0 && <Picture id="world" s={s} />}
      {roots.length > 0 && <SettingMap s={s} />}
      <nav className="gaz-nav">
        {roots.map((r) => <button key={r} onClick={() => go(r)}>{s.names[r]}</button>)}
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
            {editing && (
              <div className="edit-row">
                {ASPECTS.flatMap(([type, label]) => {
                  const now = aspectsOf(s, r, type)
                  return (now.length ? now : [undefined]).map((id, i) => <Pick key={`${type}${i}`} s={s} root={r} type={type} label={label} current={id} optional={type !== 'terrain'} />)
                })}
                <button onClick={() => edit((d) => redrawPlace(d, r))} title="Pick the description again at random, keeping the land and its sites">↻ Surprise me</button>
                <button onClick={() => drop(r)}>Remove place</button>
              </div>
            )}
            <SpotBody sp={v.land} s={s} />
            {v.sites.map((site) => (
              <section key={site.id} id={`set-${site.id}`} className="entry nested site">
                <h5><Name id={site.id} s={s} /> <small>site</small></h5>
                <div className="prose"><p>{site.text}</p></div>
                {editing && (
                  <div className="edit-row">
                    <Pick s={s} root={r} type="site" label="Kind of site" current={site.id} />
                    <button onClick={() => drop(site.id)}>Remove site</button>
                  </div>
                )}
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
          {s.hooks.map((h) => (
            <li key={h.id}>
              {hookText(s, h)} <button className="link" onClick={() => go(h.lines[0].who)}>({s.names[h.at]})</button>
              {editing && (
                <span className="rename shown">
                  <button title="Draw this story again" aria-label="Draw this story again" onClick={() => edit((d) => rerollStory(d, h.id))}>↻</button>
                  <button title="Remove this story" aria-label="Remove this story" onClick={() => edit((d) => removeStory(d, h.id))}>×</button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {editing && s.people.length === 0 && <p className="hint">Stories start from people: add a person, then use “+ Story” under them.</p>}
      </details>
    </div>
    </EditCtx.Provider>
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
                <small>{rootsOf(x).length} places · {x.manual ? 'built by hand' : `seed ${x.seed}`}</small>
              </button>
              <button title="Delete setting" aria-label="Delete setting" onClick={() => { if (confirm(`Delete ${x.names.world} and its pictures?`)) { void removeImages(`${x.id}:`); st.remove(x.id) } }}>×</button>
            </div>
          ))}
          <button className={current ? '' : 'primary'} onClick={() => st.select(null)}>+ New setting</button>
        </aside>
        <main className="setting-main">{current ? <Gazetteer key={current.id} s={current} /> : <NewSetting />}</main>
      </div>
    </div>
  )
}
