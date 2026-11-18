import { create } from 'zustand'
import { busy, collect, ComfyError, defaultComfyUrl, free, interruptOwn, stats, submit, type ImageJob } from './comfy'

// Pictures are far too big for the browser's ordinary storage, so they live in IndexedDB, one record per
// element under the key "<setting id>:<element id>". The store below holds the address of ComfyUI, the
// list of pictures still to make, and links to the pictures already loaded.

const DB = 'storyloom-images'
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('images')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
const tx = async <T,>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    // Resolve only once the transaction is complete, so a write is safely stored before anything else happens.
    const t = db.transaction('images', mode)
    const req = run(t.objectStore('images'))
    t.oncomplete = () => resolve(req.result)
    t.onerror = t.onabort = () => reject(t.error ?? req.error)
  })
}

/**
 * The colour a picture leaves as an impression: the average of its pixels, with vivid ones counting for
 * more than grey ones so that a few strong colours are not drowned by a dull sky or shadow.
 */
export function tintOf(rgba: ArrayLike<number>): string {
  let r = 0, g = 0, b = 0, total = 0
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const [pr, pg, pb] = [rgba[i], rgba[i + 1], rgba[i + 2]]
    const weight = 0.25 + (Math.max(pr, pg, pb) - Math.min(pr, pg, pb)) / 255
    r += pr * weight; g += pg * weight; b += pb * weight; total += weight
  }
  if (!total) return '#808080'
  return `#${[r, g, b].map((v) => Math.round(v / total).toString(16).padStart(2, '0')).join('')}`
}

/** Shrink a picture to a few dozen pixels and read its tint. Returns nothing where that cannot be done. */
async function readTint(blob: Blob): Promise<string | undefined> {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 24
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, 24, 24)
    return tintOf(ctx.getImageData(0, 0, 24, 24).data)
  } catch { return undefined }
}

export interface Wanted extends ImageJob { key: string; label: string }
type Status = 'idle' | 'working' | 'busy' | 'error' | 'paused'
/** A picture that has been through the queue: made, skipped or failed, and when. */
export interface Done { key: string; label: string; at: number; result: 'made' | 'skipped' | 'failed'; note?: string }

interface Images {
  url: string
  steps: number
  status: Status
  message: string
  queue: Wanted[]
  current: (Wanted & { id?: string; since?: number }) | null
  made: number
  /** Held: the picture in hand is finished and no more are started until it is released. */
  held: boolean
  /** What has been through the queue since the page was opened, newest first. */
  done: Done[]
  /** Object links for the pictures loaded so far, by key. */
  links: Record<string, string>
  /** The overall colour of each loaded picture, by key. */
  tints: Record<string, string>
  setUrl(url: string): void
  setSteps(steps: number): void
  test(): Promise<void>
  load(prefix: string): Promise<void>
  add(jobs: Omit<Wanted, 'steps'>[]): void
  cancel(): Promise<void>
  /** Finish the picture in hand and start no more; and take up the list again. */
  hold(): void
  release(): void
  /** Give up the picture in hand and go on to the next. */
  skip(): Promise<void>
  /** Take one waiting picture off the list, or all of them. */
  drop(key: string): void
  clear(): void
  /** Move a waiting picture to the front, or one place earlier or later. */
  move(key: string, to: 'first' | 'earlier' | 'later'): void
  remove(key: string): Promise<void>
  removeAll(prefix: string): Promise<void>
}

const saved = (() => {
  try { return JSON.parse(localStorage.getItem('storyloom-comfy') ?? '{}') as { url?: string; steps?: number } } catch { return {} }
})()
const keep = (s: Images) => { try { localStorage.setItem('storyloom-comfy', JSON.stringify({ url: s.url, steps: s.steps })) } catch { /* private window */ } }

let running = false
let stop = false
let skipping = false

export const useImages = create<Images>()((set, get) => {
  const link = (key: string, blob: Blob) => {
    const old = get().links[key]
    if (old) URL.revokeObjectURL(old)
    set((s) => ({ links: { ...s.links, [key]: URL.createObjectURL(blob) } }))
    void readTint(blob).then((tint) => { if (tint && get().links[key]) set((s) => ({ tints: { ...s.tints, [key]: tint } })) })
  }

  /** Work through the list one picture at a time, stepping aside whenever ComfyUI has other work. */
  const log = (job: Wanted, result: Done['result'], note?: string) => set((s) => ({ done: [{ key: job.key, label: job.label, at: Date.now(), result, ...(note ? { note } : {}) }, ...s.done].slice(0, 60) }))
  const run = async () => {
    if (running) return
    running = true
    stop = false
    let made = 0
    const { url } = get()
    try {
      while (get().queue.length && !stop) {
        if (get().held) {
          set({ status: 'paused', message: `Paused with ${get().queue.length} waiting. Nothing more is sent until you resume.`, current: null })
          return
        }
        if (await busy(url)) {
          set({ status: 'busy', message: 'ComfyUI is busy with another job. Nothing was sent; press Resume when it is free.' })
          return
        }
        const [job, ...rest] = get().queue
        set({ queue: rest, current: { ...job, since: Date.now() }, status: 'working', message: `Making a picture of ${job.label}…` })
        const id = await submit(url, job)
        set({ current: { ...job, id, since: Date.now() } })
        skipping = false
        const blob = await collect(url, id, () => stop || skipping)
        if (!blob) {
          log(job, 'skipped')
          if (skipping && !stop) { skipping = false; set({ current: null }); continue }
          break
        }
        await tx('readwrite', (st) => st.put({ blob, prompt: job.prompt, seed: job.seed, made: Date.now() }, job.key))
        link(job.key, blob)
        made++
        log(job, 'made')
        set((s) => ({ made: s.made + 1, current: null }))
      }
      if (get().held && get().queue.length) set({ status: 'paused', message: `Paused with ${get().queue.length} waiting. Nothing more is sent until you resume.`, current: null })
      else set({ status: 'idle', message: made ? `Done: ${made} picture${made === 1 ? '' : 's'} made.` : '', current: null })
    } catch (e) {
      const job = get().current
      if (job) log(job, 'failed', e instanceof ComfyError ? e.message : 'Something went wrong while making the picture.')
      set((s) => ({ status: 'error', message: e instanceof ComfyError ? e.message : 'Something went wrong while making the picture.', current: null, queue: job ? [job, ...s.queue] : s.queue }))
    } finally {
      running = false
      // Leave the GPU clear for the user's other work.
      if (made) free(url).catch(() => {})
    }
  }

  return {
    url: saved.url || defaultComfyUrl(),
    steps: saved.steps || 25,
    status: 'idle',
    message: '',
    queue: [],
    current: null,
    made: 0,
    held: false,
    done: [],
    links: {},
    tints: {},
    setUrl: (url) => { set({ url: url.trim() || defaultComfyUrl() }); keep(get()) },
    setSteps: (steps) => { set({ steps: Math.min(60, Math.max(4, Math.round(steps) || 25)) }); keep(get()) },
    test: async () => {
      set({ status: 'working', message: 'Looking for ComfyUI…' })
      try {
        const version = await stats(get().url)
        const taken = await busy(get().url)
        set({ status: taken ? 'busy' : 'idle', message: `Connected to ComfyUI ${version}. ${taken ? 'It is busy with another job right now.' : 'It is free.'}` })
      } catch (e) {
        set({ status: 'error', message: e instanceof ComfyError ? e.message : 'Could not reach ComfyUI.' })
      }
    },
    load: async (prefix) => {
      try {
        const keys = (await tx('readonly', (st) => st.getAllKeys())) as string[]
        for (const key of keys.filter((k) => k.startsWith(prefix) && !get().links[k])) {
          const rec = await tx<{ blob: Blob } | undefined>('readonly', (st) => st.get(key))
          if (rec?.blob) link(key, rec.blob)
        }
      } catch { /* no storage available: pictures simply will not persist */ }
    },
    add: (jobs) => {
      const steps = get().steps
      const waiting = new Set([...get().queue.map((j) => j.key), get().current?.key])
      set((s) => ({ queue: [...s.queue, ...jobs.filter((j) => !waiting.has(j.key)).map((j) => ({ ...j, steps }))], made: running ? s.made : 0 }))
      void run()
    },
    hold: () => { set({ held: true }); if (!running && get().queue.length) set({ status: 'paused', message: `Paused with ${get().queue.length} waiting. Nothing more is sent until you resume.` }) },
    release: () => { set({ held: false }); if (get().queue.length) void run(); else if (get().status === 'paused') set({ status: 'idle', message: '' }) },
    skip: async () => {
      const id = get().current?.id
      if (!id) return
      skipping = true
      try { await interruptOwn(get().url, id) } catch { /* it will be given up when next looked at */ }
    },
    drop: (key) => set((s) => ({ queue: s.queue.filter((j) => j.key !== key) })),
    clear: () => set((s) => ({ queue: [], ...(s.status === 'paused' || s.status === 'busy' || s.status === 'error' ? { status: 'idle' as Status, message: '' } : {}) })),
    move: (key, to) => set((s) => {
      const at = s.queue.findIndex((j) => j.key === key)
      if (at < 0) return {}
      const queue = [...s.queue], [job] = queue.splice(at, 1)
      queue.splice(to === 'first' ? 0 : Math.max(0, Math.min(queue.length, at + (to === 'earlier' ? -1 : 1))), 0, job)
      return { queue }
    }),
    cancel: async () => {
      stop = true
      const id = get().current?.id
      set({ queue: [], status: 'idle', message: 'Stopped.' })
      if (id) {
        try { await interruptOwn(get().url, id); await free(get().url) } catch { /* nothing more to do */ }
      }
    },
    remove: async (key) => {
      const old = get().links[key]
      if (old) URL.revokeObjectURL(old)
      set((s) => { const links = { ...s.links }, tints = { ...s.tints }; delete links[key]; delete tints[key]; return { links, tints } })
      try { await tx('readwrite', (st) => st.delete(key)) } catch { /* already gone */ }
    },
    removeAll: async (prefix) => {
      for (const key of Object.keys(get().links).filter((k) => k.startsWith(prefix))) await get().remove(key)
      try {
        const keys = (await tx('readonly', (st) => st.getAllKeys())) as string[]
        for (const key of keys.filter((k) => k.startsWith(prefix))) await tx('readwrite', (st) => st.delete(key))
      } catch { /* nothing stored */ }
    },
  }
})
