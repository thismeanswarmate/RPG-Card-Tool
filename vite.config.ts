import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When the app is run locally, requests to /comfy are passed on to ComfyUI on this machine. The Origin
// header is dropped on the way, because ComfyUI turns away requests that name another origin.
const proxy = {
  '/comfy': {
    target: 'http://127.0.0.1:8188',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/comfy/, ''),
    configure: (server: { on(event: 'proxyReq', fn: (req: { removeHeader(name: string): void }) => void): void }) =>
      server.on('proxyReq', (req) => req.removeHeader('origin')),
  },
}

export default defineConfig({ base: './', plugins: [react()], server: { proxy }, preview: { proxy } })
