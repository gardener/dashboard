//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const HttpClient = require('./HttpClient')
const { V1, V1Alpha1, V1Beta1, CoreGroup, NamedGroup } = require('./mixins')

class APIRegistration extends V1(NamedGroup(HttpClient)) {
  static get group () {
    return 'apiregistration.k8s.io'
  }
}

class Authentication extends V1(NamedGroup(HttpClient)) {
  static get group () {
    return 'authentication.k8s.io'
  }
}

class Authorization extends V1(NamedGroup(HttpClient)) {
  static get group () {
    return 'authorization.k8s.io'
  }
}

class Core extends V1(CoreGroup(HttpClient)) {
  static get group () {
    return ''
  }
}

class Extensions extends V1Beta1(NamedGroup(HttpClient)) {
  static get group () {
    return 'extensions'
  }
}

class GardenerCore extends V1Beta1(NamedGroup(HttpClient)) {
  static get group () {
    return 'core.gardener.cloud'
  }
}

class GardenerDashboard extends V1Alpha1(NamedGroup(HttpClient)) {
  static get group () {
    return 'dashboard.gardener.cloud'
  }
}

module.exports = {
  APIRegistration,
  Authentication,
  Authorization,
  Core,
  Extensions,
  GardenerCore,
  GardenerDashboard
}
