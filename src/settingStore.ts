import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { generateSetting, house, rename, type Answers, type Setting } from './setting'
import { newManual } from './settingBuild'

interface Settings {
  settings: Setting[]
  /** The setting on screen, or null while answering the questions for a new one. */
  current: string | null
  create(answers: Answers, seed: string): void
  /** Start an empty setting to build by hand. */
  createManual(genres: string[], lands: string[], title: string): void
  /** Change the setting on screen. */
  edit(change: (s: Setting) => void): void
  select(id: string | null): void
  remove(id: string): void
  rename(id: string, name?: string): void
  setArt(art: string): void
}

export const useSettings = create<Settings>()(
  persist(
    immer((set) => ({
      settings: [],
      current: null,
      create: (answers, seed) => set((s) => {
        const made = generateSetting(answers, seed)
        s.settings.unshift(made)
        s.current = made.id
      }),
      createManual: (genres, lands, title) => set((s) => {
        const made = newManual(genres, lands, title)
        s.settings.unshift(made)
        s.current = made.id
      }),
      edit: (change) => set((s) => {
        const setting = s.settings.find((x) => x.id === s.current)
        if (setting) { change(setting); house(setting) }
      }),
      select: (id) => set((s) => { s.current = id }),
      remove: (id) => set((s) => {
        s.settings = s.settings.filter((x) => x.id !== id)
        if (s.current === id) s.current = s.settings[0]?.id ?? null
      }),
      rename: (id, name) => set((s) => {
        const setting = s.settings.find((x) => x.id === s.current)
        if (setting?.names[id]) setting.names[id] = name?.trim() || rename(setting, id)
      }),
      setArt: (art) => set((s) => {
        const setting = s.settings.find((x) => x.id === s.current)
        if (setting) setting.art = art === 'auto' ? undefined : art
      }),
    })),
    { name: 'storyloom-settings-v1' },
  ),
)
