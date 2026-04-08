//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function getResourceApiVersion ({ group, version }) {
  return group ? `${group}/${version}` : version
}

function normalizeResourceListItems (body, Resource) {
  if (!body || !Array.isArray(body.items)) {
    return body
  }
  const apiVersion = getResourceApiVersion(Resource)
  const { names: { kind } = {} } = Resource
  for (const item of body.items) {
    item.apiVersion ??= apiVersion
    item.kind ??= kind
  }
  return body
}

export {
  getResourceApiVersion,
  normalizeResourceListItems,
}
