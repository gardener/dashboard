//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const app = require('./app')
const monitors = require('./monitors')

Object.assign(app, monitors)

module.exports = app
