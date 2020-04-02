//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
