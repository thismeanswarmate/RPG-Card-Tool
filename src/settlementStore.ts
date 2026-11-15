import { makeName, TONGUES } from './names'
import { makeRoller } from './rollerStore'
import { stepsFor } from './settlement'

/** Settlements, each given a place name in one of the name generator's old-world tongues. */
export const useSettlements = makeRoller('storyloom-settlements-v1', stepsFor, (_rolls, taken) => {
  // Every tongue but the star-faring one, which names things like stations.
  const fitting = TONGUES.map((x, i) => (x.id === 'star' ? -1 : i)).filter((i) => i >= 0)
  return makeName({ kind: 'place', tongue: fitting[Math.floor(Math.random() * fitting.length)] }, Math.random, new Set(taken.map((x) => x.toLowerCase())))
})
