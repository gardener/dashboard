
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

/*
  Returns the secretRef for the cluster, that hosts the terminal pods for the (virtual)garden
*/
async function getGardenTerminalHostClusterSecretRef ({ coreClient }) {
  const { items: runtimeSecrets } = await getGardenTerminalHostClusterSecrets({ coreClient })
  const secret = _.head(runtimeSecrets)
  if (!secret) {
    throw new Error('could not fetch garden runtime secret')
  }
  const { metadata: { name, namespace } } = secret
  return {
    name,
    namespace
  }
}

async function getGardenTerminalHostClusterSecrets ({ coreClient }) {
  const qs = { labelSelector: 'runtime=garden' }
  return coreClient.ns('garden').secrets.get({ qs })
}

module.exports = {
  getGardenTerminalHostClusterSecretRef
}
