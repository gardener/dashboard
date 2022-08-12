//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createChannel } = require('better-sse')

function matchesMetadataFn (data, eventName) {
  switch (eventName) {
    case 'issues': {
      const { projectName } = data.object.metadata
      return metadata => {
        if (Array.isArray(metadata.projectNames)) {
          return metadata.projectNames.includes(projectName)
        }
        return metadata.projectName === projectName
      }
    }
    case 'comments': {
      const { projectName, name } = data.object.metadata
      return metadata => {
        return metadata.projectName === projectName && metadata.name === name
      }
    }
    default: {
      const { namespace, name } = data.object.metadata
      return metadata => {
        if (metadata.allNamespaces) {
          return true
        }
        if (Array.isArray(metadata.namespaces)) {
          return metadata.namespaces.includes(namespace)
        }
        if (metadata.name) {
          return metadata.namespace === namespace && metadata.name === name
        }
        return metadata.namespace === namespace
      }
    }
  }
}

function filterFn (data, eventName) {
  const matchesMetadata = matchesMetadataFn(data, eventName)
  return session => {
    const { events, metadata } = session.state
    return events.includes(eventName) && matchesMetadata(metadata)
  }
}

function extend (channel) {
  channel.publish = (eventName, data) => channel.broadcast(data, eventName, {
    filter: filterFn(data, eventName)
  })
  return channel
}

module.exports = {
  shoots: extend(createChannel()),
  unhealthyShoots: extend(createChannel()),
  tickets: extend(createChannel())
}
