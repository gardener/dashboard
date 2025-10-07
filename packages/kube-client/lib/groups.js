//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import HttpClient from './HttpClient.js'
import { V1, V1Alpha1, V1Beta1, CoreGroup, NamedGroup } from './mixins.js'

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

class Coordination extends V1(NamedGroup(HttpClient)) {
  static get group () {
    return 'coordination.k8s.io'
  }
}

class Core extends V1(CoreGroup(HttpClient)) {
  static get group () {
    return ''
  }
}

class Networking extends V1(NamedGroup(HttpClient)) {
  static get group () {
    return 'networking.k8s.io'
  }
}

class GardenerCore extends V1Beta1(NamedGroup(HttpClient)) {
  static get group () {
    return 'core.gardener.cloud'
  }
}

class GardenerSeedManagement extends V1Alpha1(NamedGroup(HttpClient)) {
  static get group () {
    return 'seedmanagement.gardener.cloud'
  }
}

class GardenerDashboard extends V1Alpha1(NamedGroup(HttpClient)) {
  static get group () {
    return 'dashboard.gardener.cloud'
  }
}

class GardenerSecurity extends V1Alpha1(NamedGroup(HttpClient)) {
  static get group () {
    return 'security.gardener.cloud'
  }
}

class KCPTenancy extends V1Alpha1(NamedGroup(HttpClient)) {
  static get group () {
    return 'tenancy.kcp.io'
  }
}

export {
  APIRegistration,
  Authentication,
  Authorization,
  Coordination,
  Core,
  Networking,
  GardenerCore,
  GardenerSeedManagement,
  GardenerDashboard,
  GardenerSecurity,
  KCPTenancy,
}
