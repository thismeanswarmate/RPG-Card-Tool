import { brief, kindLabel, stepsFor } from './peril'
import { usePerils } from './perilStore'
import { Roller } from './Roller'

export const Perils = () => (
  <Roller
    useStore={usePerils} stepsFor={stepsFor} brief={brief}
    summary={(rolls) => (rolls.kind === undefined ? undefined : kindLabel(rolls))}
    plural="Places" single="place" tool="perils"
    emptyBrief="Roll the tables and the place is written up here: what it is, what was there before, and what makes it dangerous."
  />
)
