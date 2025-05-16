//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import get from 'lodash/get'
import compact from 'lodash/compact'
import uniq from 'lodash/uniq'
import flatMap from 'lodash/flatMap'
import map from 'lodash/map'
import some from 'lodash/some'

export function errorCodesFromArray (array) {
  return uniq(compact(flatMap(array, 'codes')))
}

export function isUserError (errorCodesArray) {
  return some(objectsFromErrorCodes(errorCodesArray), 'userError')
}

export function isTemporaryError (errorCodesArray) {
  return some(objectsFromErrorCodes(errorCodesArray), 'temporaryError')
}

export function objectsFromErrorCodes (errorCodesArray) {
  return map(errorCodesArray, code => {
    const defaultCodeObject = {
      code,
      description: `Error Code: ${code}`,
      shortDescription: `Error Code: ${code}`,
    }
    return get(errorCodes, [code], defaultCodeObject)
  })
}

const errorCodes = {
  ERR_INFRA_UNAUTHENTICATED: {
    shortDescription: 'Invalid Credentials',
    description: 'Invalid authentication credentials.',
    temporaryError: false,
    userError: true,
    infraAccountError: true,
  },
  ERR_INFRA_UNAUTHORIZED: {
    shortDescription: 'Not authorized',
    description: 'Insufficient privileges to complete the request.',
    temporaryError: false,
    userError: true,
    infraAccountError: true,
  },
  ERR_INFRA_QUOTA_EXCEEDED: {
    shortDescription: 'Quota Exceeded',
    description: 'Cloud provider quota exceeded. Please request limit increases.',
    temporaryError: false,
    userError: true,
    infraAccountError: true,
  },
  ERR_INFRA_DEPENDENCIES: {
    shortDescription: 'Infrastructure Dependencies',
    description: 'Infrastructure operation failed due to issues with cloud provider resources, configuration, or unmanaged resources. Please check your cloud environment, resolve any unmet requirements or conflicts, and remove any manually created resources related to this Shoot.',
    temporaryError: false,
    userError: true,
    infraAccountError: true,
  },
  ERR_CLEANUP_CLUSTER_RESOURCES: {
    shortDescription: 'Cleanup Cluster',
    description: 'Cleaning up the cluster failed as some resource are stuck in deletion. Please remove these resources properly or a forceful deletion will happen if this error persists.',
    temporaryError: false,
    userError: true,
  },
  ERR_INFRA_RESOURCES_DEPLETED: {
    shortDescription: 'Infrastructure Resources Depleted',
    description: 'The underlying infrastructure provider proclaimed that it does not have enough resources to fulfill your request at this point in time. You might want to wait or change your shoot configuration.',
    temporaryError: false,
    userError: true,
    infraAccountError: true,
  },
  ERR_CONFIGURATION_PROBLEM: {
    shortDescription: 'Configuration Problem',
    description: 'There is a configuration problem that is most likely caused by your Shoot specification. Please double-check the error message and resolve the problem.',
    temporaryError: false,
    userError: true,
  },
  ERR_RETRYABLE_CONFIGURATION_PROBLEM: {
    shortDescription: 'Configuration Problem',
    description: 'There is a configuration problem. Please double-check the error message and resolve the problem.',
    temporaryError: false,
    userError: true,
  },
  ERR_INFRA_RATE_LIMITS_EXCEEDED: {
    shortDescription: 'Rate Limit Exceeded',
    description: 'Cloud provider rate limit exceeded. The operation will be retried automatically.',
    temporaryError: true,
    userError: false,
  },
  ERR_RETRYABLE_INFRA_DEPENDENCIES: {
    shortDescription: 'Retryable Infrastructure Error',
    description: 'Error occurred due to dependent objects on the infrastructure level. The operation will be retried automatically.',
    temporaryError: true,
    userError: false,
  },
  ERR_PROBLEMATIC_WEBHOOK: {
    shortDescription: 'Misconfigured Webhook',
    description: 'A misconfigured webhook prevents Gardener from performing operations. Please resolve this as this can lead to required actions not being performed which will eventually turn the cluster into an error state.',
    link: {
      text: 'Best practices',
      url: 'https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#best-practices-and-warnings',
    },
    temporaryError: false,
    userError: true,
  },
}
