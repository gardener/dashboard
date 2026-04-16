//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import * as helper from './helper.js'
import helm from './helm.js'
import gardenerDashboard from './gardener-dashboard.js'
import identity from './identity.js'

export default {
  helper,
  helm,
  'gardener-dashboard': gardenerDashboard,
  identity,
}
