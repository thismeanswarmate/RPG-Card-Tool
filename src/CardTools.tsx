import { CardTool } from './CardTool'
import { CULTURES, HISTORY, RACES, useCultures, useHistory, useRaces } from './cardTools'

export const Races = () => (
  <CardTool def={RACES} useStore={useRaces} plural="Races" single="race"
    blurb="A people: what they are like, where they came from, what they are good at and what it costs them." />
)
export const Cultures = () => (
  <CardTool def={CULTURES} useStore={useCultures} plural="Cultures" single="culture"
    blurb="A way of life: what a people prize, who decides, how they live together, and what they are quarrelling about." />
)
export const History = () => (
  <CardTool def={HISTORY} useStore={useHistory} plural="Histories" single="history"
    blurb="A past told in ages: how each began, who mattered, what was done and at what cost, how it ended and what is left. Add or remove ages as you like." />
)
