
//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { isHttpError } = require('@gardener-dashboard/request')
const { Resources } = require('@gardener-dashboard/kube-client')

const logger = require('../logger')

const { kDryRun } = require('./symbols')

const COMPONENT_TERMINAL = 'dashboard-terminal'
const TERMINAL_KUBE_APISERVER = 'dashboard-terminal-kube-apiserver'

function toIngressResource ({ spec, ...rest }) {
  return toResource({
    resource: Resources.Ingress,
    data: { spec },
    ...rest
  })
}

function toServiceResource ({ spec, ...rest }) {
  return toResource({
    resource: Resources.Service,
    data: { spec },
    ...rest
  })
}

function toEndpointResource ({ subsets, ...rest }) {
  return toResource({
    resource: Resources.Endpoints,
    data: { subsets },
    ...rest
  })
}

function toResource ({
  resource,
  name,
  generateName,
  namespace,
  annotations = {},
  labels = {},
  ownerReferences = [],
  data
}) {
  const { apiVersion, kind } = resource

  labels.component = COMPONENT_TERMINAL

  const metadata = {
    labels,
    annotations,
    ownerReferences
  }
  if (name) {
    metadata.name = name
  }
  if (generateName) {
    metadata.generateName = generateName
  }
  if (namespace) {
    metadata.namespace = namespace
  }

  const resourceBody = {
    apiVersion,
    kind,
    metadata
  }
  Object.assign(resourceBody, data)

  return resourceBody
}

async function replaceResource (resource, { namespace, name, body, dryRun }) {
  if (dryRun !== true) {
    try {
      return await resource.mergePatch(namespace, name, body)
    } catch (err) {
      if (isHttpError(err, 404)) {
        return resource.create(namespace, body)
      }
      throw err
    }
  } else {
    const { group, version, names: { kind } } = resource
    const apiVersion = group ? `${group}/${version}` : version
    logger.info(`Replacing resource ${apiVersion}, Kind=${kind} was skipped in dry run mode`)
    return { metadata: { namespace, name } }
  }
}

function replaceIngressApiServer (client, { namespace, name, host, tlsHost, serviceName, ownerReferences, annotations, secretName }) {
  if (!secretName) {
    secretName = `${name}-tls`
  }

  const spec = {
    rules: [
      {
        host,
        http: {
          paths: [
            {
              backend: {
                service: {
                  name: serviceName,
                  port: {
                    number: 443
                  }
                }
              },
              path: '/',
              pathType: 'Prefix'
            }
          ]
        }
      }
    ],
    tls: [
      {
        hosts: [
          tlsHost
        ],
        secretName
      }
    ]
  }

  const body = toIngressResource({ name, annotations, spec, ownerReferences })

  return replaceResource(client['networking.k8s.io'].ingresses, {
    namespace,
    name,
    body,
    dryRun: client[kDryRun]
  })
}

function replaceEndpointApiServer (client, { namespace, name, ip, port, ownerReferences }) {
  const subsets = [
    {
      addresses: [
        {
          ip
        }
      ],
      ports: [
        {
          port,
          protocol: 'TCP'
        }
      ]
    }
  ]

  const body = toEndpointResource({ namespace, name, subsets, ownerReferences })

  return replaceResource(client.core.endpoints, {
    namespace,
    name,
    body,
    dryRun: client[kDryRun]
  })
}

function replaceServiceApiServer (client, { namespace, name, externalName, ownerReferences, clusterIP = 'None', targetPort }) {
  let type
  if (externalName) {
    type = 'ExternalName'
    clusterIP = undefined
  }

  const spec = {
    clusterIP,
    ports: [
      {
        port: 443,
        protocol: 'TCP',
        targetPort
      }
    ],
    type, // optional
    externalName // optional
  }

  const body = toServiceResource({ namespace, name, spec, ownerReferences })

  return replaceResource(client.core.services, {
    namespace,
    name,
    body,
    dryRun: client[kDryRun]
  })
}

module.exports = {
  TERMINAL_KUBE_APISERVER,
  toResource,
  toIngressResource,
  toServiceResource,
  toEndpointResource,
  replaceResource,
  replaceIngressApiServer,
  replaceServiceApiServer,
  replaceEndpointApiServer
}
