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

const _ = require('lodash')
const config = require('../config')

module.exports = {
  '/info': require('./info'),
  '/user': require('./user'),
  '/cloudprofiles': require('./cloudprofiles'),
  '/domains': require('./domains'),
  '/shoots': require('./shoots'),
  '/namespaces': require('./namespaces'),
  '/namespaces/:namespace/shoots': require('./shoots'),
  '/namespaces/:namespace/infrastructure-secrets': require('./infrastructureSecrets'),
  '/namespaces/:namespace/members': require('./members')
}

if (_.get(config, 'frontend.features.terminalEnabled', false)) {
  module.exports['/namespaces/:namespace/terminals/:target'] = require('./terminals')
}
