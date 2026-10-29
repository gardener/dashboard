//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'
import pLimit from 'p-limit'
import cache from '../cache/index.js'
import logger from '../logger/index.js'
import {
  projectFilter,
  shootHasIssue,
  toDerivedResource,
} from '../utils/index.js'
import * as authorization from './authorization.js'
import {
  ALL_UNHEALTHY_FILTER_FLAGS,
  exclusionBits,
} from './shootClassification.js'

const kind = 'ProjectStat'
const SHOOT_QUOTA_KEY = 'count/shoots.core.gardener.cloud'
const ACCESS_REVIEW_CONCURRENCY = 10
const isNonPendingProject = projectFilter(undefined, true)

const magnitudeFactors = new Map([
  ['m', 1e-3],
  ['k', 1e3],
  ['M', 1e6],
  ['G', 1e9],
  ['T', 1e12],
  ['P', 1e15],
  ['E', 1e18],
  ['Ki', 2 ** 10],
  ['Mi', 2 ** 20],
  ['Gi', 2 ** 30],
  ['Ti', 2 ** 40],
  ['Pi', 2 ** 50],
  ['Ei', 2 ** 60],
])
const magnitudeSuffixes = Array.from(magnitudeFactors.keys()).sort((a, b) => b.length - a.length)
const quantityCharacters = new Set('0123456789+-.eE')

// user.groups is hydrated when the socket user is created.
async function resolveProjectStatScope (user) {
  const canListAllProjectStats = await hasGlobalProjectStatAccess(user)
  const candidateProjects = cache.getProjects().filter(projectFilter(user, canListAllProjectStats))

  if (canListAllProjectStats) {
    return {
      canListAllProjectStats: true,
      projectStatNamespaces: new Set(),
    }
  }

  return {
    canListAllProjectStats: false,
    projectStatNamespaces: await getAuthorizedNamespaces(user, candidateProjects),
  }
}

async function hasGlobalProjectStatAccess (user) {
  if (!await authorization.canListProjects(user)) {
    return false
  }

  const [canListShoots, canListResourceQuotas] = await Promise.all([
    authorization.canListShoots(user),
    authorization.canListResourceQuotas(user),
  ])
  return canListShoots && canListResourceQuotas
}

async function getAuthorizedNamespaces (user, projects) {
  const limit = pLimit(ACCESS_REVIEW_CONCURRENCY)
  const namespaces = await limit.map(projects, async project => {
    const namespace = project.spec.namespace
    try {
      return await hasProjectStatAccess(user, namespace) ? namespace : undefined
    } catch (err) {
      logger.warn('Failed to check project statistics access of user %s in namespace %s: %s', user.id, namespace, err.message)
      return undefined
    }
  })
  return new Set(namespaces.filter(Boolean))
}

async function hasProjectStatAccess (user, namespace) {
  const reviews = await Promise.allSettled([
    authorization.canListShoots(user, namespace),
    authorization.canListResourceQuotas(user, namespace),
  ])
  const failedReview = reviews.find(review => review.status === 'rejected')
  if (failedReview) {
    throw failedReview.reason
  }
  return reviews.every(review => review.value)
}

function getByUids (uids, projectStatScope) {
  return uids.map(uid => {
    const project = cache.getProjectByUid(uid)
    return project && isProjectStatVisible(project, projectStatScope)
      ? toProjectStat(project)
      : undefined
  })
}

function isProjectStatVisible (project, projectStatScope) {
  if (!isNonPendingProject(project)) {
    return false
  }
  return projectStatScope.canListAllProjectStats ||
    projectStatScope.projectStatNamespaces.has(project.spec.namespace)
}

function toProjectStat (project) {
  const namespace = project.spec.namespace
  const content = {
    counts: getShootCounts(namespace),
  }
  const shootQuota = getShootQuota(namespace)
  if (shootQuota) {
    content.shootQuota = shootQuota
  }
  return toDerivedResource(kind, project, content)
}

function getShootCounts (namespace) {
  let shootCount = 0
  const byExclusion = new Array(ALL_UNHEALTHY_FILTER_FLAGS + 1).fill(0)
  for (const shoot of cache.getShootsByNamespace(namespace)) {
    shootCount += 1
    if (shootHasIssue(shoot)) {
      byExclusion[exclusionBits(shoot)] += 1
    }
  }
  return {
    shootCount,
    unhealthyShoots: { byExclusion },
  }
}

function getShootQuota (namespace) {
  let shootQuota
  for (const { status } of cache.getResourceQuotasByNamespace(namespace)) {
    const hard = parseCountQuantity(get(status, ['hard', SHOOT_QUOTA_KEY]))
    if (hard === undefined || (shootQuota && shootQuota.hard <= hard)) {
      continue
    }
    shootQuota = {
      used: parseCountQuantity(get(status, ['used', SHOOT_QUOTA_KEY])) ?? 0,
      hard,
    }
  }
  return shootQuota
}

function parseCountQuantity (value) {
  if (typeof value !== 'string') {
    return undefined
  }

  let number = value.trim()
  let factor = 1
  const suffix = magnitudeSuffixes.find(suffix => number.endsWith(suffix))
  if (suffix) {
    number = number.slice(0, -suffix.length)
    factor = magnitudeFactors.get(suffix)
  }
  if (!number ||
    !Array.from(number).every(character => quantityCharacters.has(character)) ||
    !Array.from(number).some(character => character >= '0' && character <= '9')) {
    return undefined
  }
  const result = Number(number) * factor
  return Number.isFinite(result) ? result : undefined
}

export {
  getByUids,
  hasProjectStatAccess,
  resolveProjectStatScope,
}
