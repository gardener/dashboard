//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import {
  ALL_UNHEALTHY_FILTER_FLAGS,
  FILTER_HIDE_TICKETS,
  FILTER_NO_OPERATOR_ACTION,
  FILTER_PROGRESSING,
  shouldCountAsUnhealthy,
} from './shootClassification.js'
import cache from '../cache/index.js'
import { shootHasIssue } from '../utils/index.js'

const { Forbidden, NotFound, UnprocessableEntity } = httpErrors

const apiVersion = 'dashboard.gardener.cloud/v1alpha1'
const kind = 'SeedStat'

// unhealthyFilterMask uses the exclusion bits of shootClassification.js. Each set bit excludes a
// category from unhealthyShoots.matching: 0 counts every unhealthy shoot, 7 gives the most filtered view.

async function list ({ user, unhealthyFilterMask }) {
  await ensureAccess(user)

  unhealthyFilterMask = parseUnhealthyFilterMask(unhealthyFilterMask)

  const seeds = cache.getSeeds()
  const statsMap = getSeedStatsMap(seeds, unhealthyFilterMask)

  return seeds.map(seed => toSeedStat(seed, statsMap.get(seed.metadata.name)))
}

async function read ({ user, name, unhealthyFilterMask }) {
  await ensureAccess(user)

  unhealthyFilterMask = parseUnhealthyFilterMask(unhealthyFilterMask)

  const seed = cache.getSeed(name)
  if (!seed) {
    throw new NotFound(`Seed with name '${name}' not found`)
  }

  const counts = getCountsForSeedName(name, unhealthyFilterMask)
  return toSeedStat(seed, counts)
}

function getByUids (uids, unhealthyFilterMask) {
  unhealthyFilterMask = parseUnhealthyFilterMask(unhealthyFilterMask)
  return uids.map(uid => {
    const seed = cache.getSeedByUid(uid)
    if (!seed) {
      return undefined
    }
    const counts = getCountsForSeedName(seed.metadata.name, unhealthyFilterMask)
    return toSeedStat(seed, counts)
  })
}

function toSeedStat (seed, counts = emptyCounts()) {
  return {
    apiVersion,
    kind,
    metadata: {
      name: seed.metadata.name,
      uid: seed.metadata.uid,
    },
    counts: {
      shootCount: counts.shootCount ?? 0,
      unhealthyShoots: {
        total: counts.unhealthyShoots?.total ?? 0,
        matching: counts.unhealthyShoots?.matching ?? 0,
      },
    },
  }
}

function getSeedStatsMap (seeds, unhealthyFilterMask) {
  const statsMap = new Map()
  for (const seed of seeds) {
    const counts = getCountsForSeedName(seed.metadata.name, unhealthyFilterMask)
    statsMap.set(seed.metadata.name, counts)
  }
  return statsMap
}

function getCountsForSeedName (seedName, unhealthyFilterMask) {
  const counts = emptyCounts()
  for (const shoot of cache.getShootsBySeedName(seedName)) {
    countShoot(counts, shoot, unhealthyFilterMask)
  }
  return counts
}

function emptyCounts () {
  return {
    shootCount: 0,
    unhealthyShoots: {
      total: 0,
      matching: 0,
    },
  }
}

function countShoot (counts, shoot, unhealthyFilterMask) {
  counts.shootCount += 1
  if (!shootHasIssue(shoot)) {
    return
  }

  counts.unhealthyShoots.total += 1
  if (shouldCountAsUnhealthy(shoot, unhealthyFilterMask)) {
    counts.unhealthyShoots.matching += 1
  }
}

async function ensureAccess (user) {
  const [canListSeeds, canListAllShoots] = await Promise.all([
    authorization.canListSeeds(user),
    authorization.canListShoots(user),
  ])

  if (!canListSeeds || !canListAllShoots) {
    throw new Forbidden('You are not allowed to list seed stats')
  }
}

function parseUnhealthyFilterMask (unhealthyFilterMask) {
  if (typeof unhealthyFilterMask === 'undefined') {
    throw invalidUnhealthyFilterMask()
  }

  if (typeof unhealthyFilterMask === 'string') {
    unhealthyFilterMask = Number(unhealthyFilterMask)
  }

  if (!isValidUnhealthyFilterMask(unhealthyFilterMask)) {
    throw invalidUnhealthyFilterMask()
  }

  return unhealthyFilterMask
}

function isValidUnhealthyFilterMask (value) {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    (value & ~ALL_UNHEALTHY_FILTER_FLAGS) === 0 // rejects negatives and any bits not in 0b111 (7)
}

function invalidUnhealthyFilterMask () {
  return new UnprocessableEntity(`The 'unhealthyFilterMask' query parameter must be a non-negative integer with no bits set outside the known flags (0–${ALL_UNHEALTHY_FILTER_FLAGS})`)
}

export {
  FILTER_PROGRESSING,
  FILTER_NO_OPERATOR_ACTION,
  FILTER_HIDE_TICKETS,
  list,
  read,
  getByUids,
  parseUnhealthyFilterMask,
  shouldCountAsUnhealthy,
}
