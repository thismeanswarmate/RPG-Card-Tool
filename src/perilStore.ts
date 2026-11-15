import { makeName, titleCase, TONGUES } from './names'
import { kindLabel, stepsFor } from './peril'
import { makeRoller } from './rollerStore'

/** Dangerous places, each named in the plain old-country style around what kind of place it is. */
export const usePerils = makeRoller(
  'storyloom-perils-v1',
  stepsFor,
  (rolls, taken) => {
    const tongue = Math.max(0, TONGUES.findIndex((x) => x.id === 'old'))
    return titleCase(makeName({ kind: 'site', tongue, base: kindLabel(rolls) }, Math.random, new Set(taken.map((x) => x.toLowerCase()))))
  },
  'perils',
)
