//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { matchers, ...fixtures } = require('./__fixtures__')

expect.extend(matchers)

global.fixtures = fixtures
