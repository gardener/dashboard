//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const gardener = require('./gardener')

module.exports = gardener.loadConfig(gardener.getFilename())
