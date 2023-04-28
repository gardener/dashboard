//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const jsYaml = import('js-yaml')

const yaml = {
  dump (obj) {
    return jsYaml.then(({ dump }) => dump(obj, {
      skipInvalid: true,
    }))
  },
  load (data) {
    return jsYaml.then(({ load }) => load(data))
  },
}

export default {
  install (app) {
    app.config.globalProperties.$yaml = yaml
    app.provide('yaml', yaml)
  },
}
