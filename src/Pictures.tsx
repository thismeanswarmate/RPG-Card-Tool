import { useEffect, useState } from 'react'
import { allowHint, isDirect } from './comfy'
import { useImages, type Wanted } from './imageStore'
import { ToolNav } from './ToolNav'

// The queue of pictures: what is being made, what is waiting and in what order, what has been done, and the
// controls over all of it. Pictures are asked for wherever a thing is shown; this is where the asking ends up.

const ago = (at: number, now: number) => {
  const s = Math.max(0, Math.round((now - at) / 1000))
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

function Job({ job, children }: { job: Wanted; children?: React.ReactNode }) {
  return (
    <li className="q-job">
      <div className="q-head">
        <b>{job.label}</b>
        <small>{job.w}×{job.h} · {job.steps} steps</small>
        <span className="q-buttons">{children}</span>
      </div>
      <details><summary>Prompt</summary><p className="q-prompt">{job.prompt}</p></details>
    </li>
  )
}

export function Pictures() {
  const im = useImages()
  // The clock ticks only while something is being made, to show how long it has been.
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!im.current) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [im.current])
  const waiting = im.queue.length
  const state = im.current ? 'Making a picture' : im.status === 'paused' ? 'Paused' : im.status === 'busy' ? 'Waiting for ComfyUI' : im.status === 'error' ? 'Stopped on an error' : waiting ? 'Starting' : 'Idle'
  return (
    <div className="app">
      <header className="topbar"><ToolNav /></header>
      <div className="queue-page">
        <header className="gaz-head">
          <h2>Pictures</h2>
          <p className="hint">Every picture asked for anywhere in Storyloom is made here, one at a time, by ComfyUI on your own computer.</p>
        </header>

        <section className="q-panel" aria-label="State of the queue">
          <div className={`q-state s-${im.current ? 'working' : im.status}`}>
            <strong>{state}</strong>
            <span>{waiting} waiting{im.held && im.current ? ' · pausing after this one' : ''}</span>
          </div>
          {im.message && <p className="hint" role="status">{im.message}</p>}
          <div className="actions">
            {im.held
              ? <button className="primary" onClick={im.release}>Resume</button>
              : <button onClick={im.hold} disabled={!im.current && !waiting} title="Finish the picture in hand, then start no more until you resume">Pause</button>}
            {(im.status === 'busy' || im.status === 'error') && waiting > 0 && !im.held && <button className="primary" onClick={im.release}>Try again</button>}
            <button onClick={im.clear} disabled={!waiting} title="Take every waiting picture off the list; the one in hand is finished">Clear waiting</button>
            <button onClick={() => { if (confirm('Stop the picture in hand and clear the whole list?')) void im.cancel() }} disabled={!im.current && !waiting}>Stop everything</button>
          </div>
        </section>

        <section>
          <h3 className="gz-band">Now</h3>
          {im.current ? (
            <ul className="q-list">
              <Job job={im.current}>
                <small>{im.current.since ? ago(im.current.since, now) : ''}</small>
                <button onClick={() => void im.skip()} title="Give this one up and go on to the next">Skip</button>
              </Job>
            </ul>
          ) : <p className="hint">Nothing is being made.</p>}
        </section>

        <section>
          <h3 className="gz-band">Waiting <small>{waiting}</small></h3>
          {waiting ? (
            <ol className="q-list">
              {im.queue.map((job, k) => (
                <Job key={job.key} job={job}>
                  <button onClick={() => im.move(job.key, 'first')} disabled={k === 0} title="Make this one next" aria-label={`Make ${job.label} next`}>⤒</button>
                  <button onClick={() => im.move(job.key, 'earlier')} disabled={k === 0} title="Earlier" aria-label={`Move ${job.label} earlier`}>↑</button>
                  <button onClick={() => im.move(job.key, 'later')} disabled={k === waiting - 1} title="Later" aria-label={`Move ${job.label} later`}>↓</button>
                  <button onClick={() => im.drop(job.key)} title="Take it off the list" aria-label={`Remove ${job.label} from the list`}>×</button>
                </Job>
              ))}
            </ol>
          ) : <p className="hint">Nothing is waiting. Use “Make picture” on anything, or “Make all missing pictures” in a setting, and it will appear here.</p>}
        </section>

        <section>
          <h3 className="gz-band">Done since this page was opened <small>{im.done.length}</small></h3>
          {im.done.length ? (
            <ul className="q-list q-done">
              {im.done.map((d) => (
                <li key={`${d.key}:${d.at}`} className={`q-job r-${d.result}`}>
                  <div className="q-head">
                    {d.result === 'made' && im.links[d.key] && <img src={im.links[d.key]} alt="" loading="lazy" />}
                    <b>{d.label}</b>
                    <small>{d.result === 'made' ? 'made' : d.result === 'skipped' ? 'given up' : 'failed'} · {new Date(d.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                    {d.result === 'made' && im.links[d.key] && <a className="button" href={im.links[d.key]} download={`${d.label.replace(/\W+/g, '-').toLowerCase() || 'picture'}.png`}>Save</a>}
                  </div>
                  {d.note && <p className="hint">{d.note}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="hint">Nothing yet.</p>}
        </section>

        <section className="q-panel">
          <h3 className="gz-band">ComfyUI</h3>
          <div className="images-body">
            <label>ComfyUI address <input value={im.url} onChange={(e) => im.setUrl(e.target.value)} spellCheck={false} /></label>
            <label>Steps <input type="number" min={4} max={60} value={im.steps} onChange={(e) => im.setSteps(+e.target.value)} /></label>
            <div className="actions"><button onClick={() => void im.test()} disabled={!!im.current}>Test connection</button></div>
            <p className="hint">Steps apply to pictures asked for from now on. One picture is made at a time, nothing is sent while ComfyUI has other work, and its memory is freed when the list is done.</p>
            <p className="hint">
              {isDirect(im.url)
                ? <>This page talks to ComfyUI directly, so ComfyUI has to be told to accept it. {allowHint()}</>
                : <>Requests go through this app’s own server, so ComfyUI needs no changes.</>}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
