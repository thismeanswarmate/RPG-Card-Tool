import { Roller } from './Roller'
import { brief, stepsFor, typeLabel } from './settlement'
import { useSettlements } from './settlementStore'

export const Settlements = () => (
  <Roller
    useStore={useSettlements} stepsFor={stepsFor} brief={brief} summary={typeLabel}
    plural="Settlements" single="settlement"
    emptyBrief="Roll the tables and the settlement is written up here: what it is, who lives there, who runs it, where to go and what people are talking about."
  />
)
