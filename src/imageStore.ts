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

export interface Wanted extends ImageJob { key: string; label: string }
type Status = 'idle' | 'working' | 'busy' | 'error'

interface Images {
  url: string
  steps: number
  status: Status
  message: string
  queue: Wanted[]
  current: (Wanted & { id?: string }) | null
  made: number
  /** Object links for the pictures loaded so far, by key. */
  links: Record<string, string>
  setUrl(url: string): void
  setSteps(steps: number): void
  test(): Promise<void>
  load(prefix: string): Promise<void>
  add(jobs: Omit<Wanted, 'steps'>[]): void
  cancel(): Promise<void>
  remove(key: string): Promise<void>
  removeAll(prefix: string): Promise<void>
}

const saved = (() => {
  try { return JSON.parse(localStorage.getItem('storyloom-comfy') ?? '{}') as { url?: string; steps?: number } } catch { return {} }
})()
const keep = (s: Images) => { try { localStorage.setItem('storyloom-comfy', JSON.stringify({ url: s.url, steps: s.steps })) } catch { /* private window */ } }

let running = false
let stop = false

export const useImages = create<Images>()((set, get) => {
  const link = (key: string, blob: Blob) => {
    const old = get().links[key]
    if (old) URL.revokeObjectURL(old)
    set((s) => ({ links: { ...s.links, [key]: URL.createObjectURL(blob) } }))
  }

  /** Work through the list one picture at a time, stepping aside whenever ComfyUI has other work. */
  const run = async () => {
    if (running) return
    running = true
    stop = false
    let made = 0
    const { url } = get()
    try {
      while (get().queue.length && !stop) {
        if (await busy(url)) {
          set({ status: 'busy', message: 'ComfyUI is busy with another job. Nothing was sent; press Resume when it is free.' })
          return
        }
        const [job, ...rest] = get().queue
        set({ queue: rest, current: job, status: 'working', message: `Making a picture of ${job.label}…` })
        const id = await submit(url, job)
        set({ current: { ...job, id } })
        const blob = await collect(url, id, () => stop)
        if (!blob) break
        await tx('readwrite', (st) => st.put({ blob, prompt: job.prompt, seed: job.seed, made: Date.now() }, job.key))
        link(job.key, blob)
        made++
        set((s) => ({ made: s.made + 1, current: null }))
      }
      set({ status: 'idle', message: made ? `Done: ${made} picture${made === 1 ? '' : 's'} made.` : '', current: null })
    } catch (e) {
      const job = get().current
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
    links: {},
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
      set((s) => { const links = { ...s.links }; delete links[key]; return { links } })
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
