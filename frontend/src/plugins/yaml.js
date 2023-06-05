//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const jsYaml = import('js-yaml')

const yaml = {
  dump (obj, options) {
    return jsYaml.then(({ dump }) => dump(obj, {
      skipInvalid: true,
      ...options,
    }))
  },
  load (data, options) {
    return jsYaml.then(({ load }) => load(data, options))
  },
}

export default {
  install (app) {
    app.provide('yaml', yaml)
  },
}
