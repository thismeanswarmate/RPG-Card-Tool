import { useEffect, useState } from 'react'
import { loosePrompt, type ImageSpec } from './imagePrompts'
import { useImages } from './imageStore'

/** The picture for one thing, with the buttons to make, redo, save or remove it. `imageKey` is where it is kept. */
export function PictureBox({ imageKey, label, spec }: { imageKey: string; label: string; spec: ImageSpec }) {
  const im = useImages()
  const src = im.links[imageKey]
  const mine = im.current?.key === imageKey
  const waiting = mine || im.queue.some((j) => j.key === imageKey)
  const [editing, setEditing] = useState<string | null>(null)
  const make = (prompt = spec.prompt, fresh = false) =>
    im.add([{ key: imageKey, label, ...spec, prompt, seed: fresh ? Math.floor(Math.random() * 2 ** 31) : spec.seed }])
  return (
    <div className="picture">
      {src && <img src={src} alt={`Picture of ${label}`} loading="lazy" />}
      <div className="pic-actions">
        {waiting ? <span className="hint">{mine ? 'Making the picture…' : 'Waiting its turn…'}</span> : (
          <>
            <button onClick={() => make(spec.prompt, !!src)}>{src ? 'New picture' : 'Make picture'}</button>
            <button onClick={() => setEditing(spec.prompt)}>Edit prompt…</button>
            {src && <a className="button" href={src} download={`${label.replace(/\W+/g, '-').toLowerCase() || 'picture'}.png`}>Save</a>}
            {src && <button onClick={() => im.remove(imageKey)}>Remove</button>}
          </>
        )}
      </div>
      {editing !== null && (
        <div className="modal-back" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header><h2>Prompt for {label}</h2><button onClick={() => setEditing(null)}>Cancel</button></header>
            <p className="hint">Describe the subject, then the setting, then the light, then the medium. Invented names are best left out.</p>
            <textarea className="prompt" value={editing} onChange={(e) => setEditing(e.target.value)} />
            <div className="actions"><button className="primary" disabled={!editing.trim()} onClick={() => { make(editing.trim(), true); setEditing(null) }}>Make picture</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ToolProps {
  /** Which tool the thing belongs to, and its id there; together they are where the picture is kept. */
  tool: string
  id: string
  label: string
  /** What the thing is, as written out by its tool. Nothing is offered until there is something to show. */
  text: string[]
  /** What kind of picture suits it. */
  lead: string
  shape: 'wide' | 'tall' | 'square'
}

/** A picture for something made in one of the standalone tools, drawn from its written description. */
export function ToolPicture({ tool, id, label, text, lead, shape }: ToolProps) {
  const load = useImages((x) => x.load)
  const message = useImages((x) => (x.status === 'error' || x.status === 'busy' ? x.message : ''))
  useEffect(() => { void load(`${tool}:`) }, [tool, load])
  if (!text.length) return null
  return (
    <>
      <PictureBox imageKey={`${tool}:${id}`} label={label || 'this'} spec={loosePrompt(`${lead} ${text.slice(0, 2).join(' ')}`, shape, `${tool}:${id}`)} />
      {message && <p className="hint">{message} The ComfyUI address is set under Pictures in any setting.</p>}
    </>
  )
}
