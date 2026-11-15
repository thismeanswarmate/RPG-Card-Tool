// Text-to-image through a local ComfyUI, over its HTTP API, with Qwen Image 2.1.
//
// The GPU is shared with the user's other work, so this client keeps to a few rules:
//   - it looks at the queue first and submits nothing while anything else is running or waiting;
//   - it never interrupts, deletes or reorders a job it did not submit;
//   - it asks ComfyUI to unload its models when a batch is finished.

export interface ImageJob { prompt: string; w: number; h: number; seed: number; steps: number }

/** Served through the dev server's proxy when the app runs locally; otherwise straight to ComfyUI. */
export const defaultComfyUrl = () =>
  typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname) ? '/comfy' : 'http://127.0.0.1:8188'

const PREFIX = 'storyloom'

/** The text-to-image graph in ComfyUI's API format. */
export const graph = (job: ImageJob) => ({
  '1': { class_type: 'UNETLoader', inputs: { unet_name: 'qwen_image_2.1_int8_convrot.safetensors', weight_dtype: 'default' } },
  '2': { class_type: 'QwenImage21Cache', inputs: { model: ['1', 0], device: 'auto', dtype: 'default' } },
  '3': { class_type: 'CLIPLoader', inputs: { clip_name: 'qwen3vl_8b_int8_convrot.safetensors', type: 'qwen_image', device: 'default' } },
  '4': { class_type: 'VAELoader', inputs: { vae_name: 'qwen_image_2.1_vae_bf16.safetensors' } },
  '5': { class_type: 'TextEncodeQwenImage21', inputs: { clip: ['3', 0], vae: ['4', 0], prompt: job.prompt, negative_prompt: '', resolution: 0 } },
  '6': { class_type: 'EmptyLatentImage', inputs: { width: job.w, height: job.h, batch_size: 1 } },
  '7': {
    class_type: 'KSampler',
    inputs: {
      model: ['2', 0], positive: ['5', 0], negative: ['5', 1], latent_image: ['6', 0], seed: job.seed, steps: job.steps, cfg: 1.0,
      sampler_name: 'euler', scheduler: 'simple', denoise: 1.0,
    },
  },
  '8': { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['4', 0] } },
  '9': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: PREFIX } },
})

export class ComfyError extends Error {}

/** True when requests go straight from the page to ComfyUI, which ComfyUI only accepts from addresses it has been told to allow. */
export const isDirect = (base: string) => /^https?:/i.test(base)

/** What to change in ComfyUI so that it accepts requests from this page. */
export const allowHint = () =>
  typeof location === 'undefined' ? ''
    : location.protocol === 'file:' ? 'This page was opened as a file, which ComfyUI always blocks. Serve it from a local server instead.'
      : `In ComfyUI Desktop, open Settings → Server-Config, put ${location.origin} in “Enable CORS header”, and restart ComfyUI.`

async function call(base: string, path: string, body?: unknown): Promise<any> {
  let res: Response
  try {
    res = await fetch(base.replace(/\/$/, '') + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new ComfyError(`Could not reach ComfyUI. Check that it is running${isDirect(base) ? ` and that it accepts requests from this page. ${allowHint()}` : '.'}`)
  }
  const text = await res.text()
  if (res.status === 403) throw new ComfyError(`ComfyUI refused the request from this page. ${allowHint()}`)
  if (!res.ok) throw new ComfyError(`ComfyUI answered ${res.status}${text ? `: ${text.slice(0, 300)}` : ''}`)
  try { return text ? JSON.parse(text) : {} } catch { throw new ComfyError('ComfyUI sent an answer this page could not read.') }
}

/** ComfyUI's version, as proof it is there. */
export const stats = async (base: string): Promise<string> => (await call(base, '/system_stats'))?.system?.comfyui_version ?? 'unknown version'

type QueueEntry = [number, string, ...unknown[]]
const queue = async (base: string): Promise<{ running: QueueEntry[]; pending: QueueEntry[] }> => {
  const q = await call(base, '/queue')
  return { running: q.queue_running ?? [], pending: q.queue_pending ?? [] }
}

/** Whether anything is running or waiting that is not the given job of ours. */
export async function busy(base: string, mine?: string): Promise<boolean> {
  const q = await queue(base)
  return [...q.running, ...q.pending].some((e) => e[1] !== mine)
}

export async function submit(base: string, job: ImageJob): Promise<string> {
  const res = await call(base, '/prompt', { prompt: graph(job), client_id: crypto.randomUUID() })
  if (res.node_errors && Object.keys(res.node_errors).length) throw new ComfyError(`ComfyUI rejected the job: ${JSON.stringify(res.node_errors).slice(0, 400)}`)
  if (!res.prompt_id) throw new ComfyError('ComfyUI did not accept the job.')
  return res.prompt_id
}

/** Wait for a job of ours to finish and fetch its picture. `stop` is polled so the wait can be abandoned. */
export async function collect(base: string, id: string, stop: () => boolean, timeoutMs = 15 * 60 * 1000, everyMs = 3000): Promise<Blob | null> {
  const started = Date.now()
  for (;;) {
    if (stop()) return null
    const h = await call(base, `/history/${id}`)
    const entry = h[id]
    if (entry) {
      if (entry.status?.status_str === 'error') throw new ComfyError(`ComfyUI could not make the picture: ${JSON.stringify(entry.status.messages ?? '').slice(0, 400)}`)
      const img = entry.outputs?.['9']?.images?.[0]
      if (!img) throw new ComfyError('The job finished without a picture.')
      const qs = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder ?? '', type: img.type ?? 'output' })
      const res = await fetch(`${base.replace(/\/$/, '')}/view?${qs}`)
      if (!res.ok) throw new ComfyError(`Could not download the picture (${res.status}).`)
      return res.blob()
    }
    if (Date.now() - started > timeoutMs) throw new ComfyError('Timed out waiting for the picture. The job is still in ComfyUI.')
    await new Promise((r) => setTimeout(r, everyMs))
  }
}

/** Stop a job, but only if it is ours and is the one running. */
export async function interruptOwn(base: string, id: string) {
  const q = await queue(base)
  if (q.running.some((e) => e[1] === id)) await call(base, '/interrupt', {})
}

/** Ask ComfyUI to unload its models, so the GPU is clear for whatever the user runs next. */
export const free = (base: string) => call(base, '/free', { unload_models: true, free_memory: true })
