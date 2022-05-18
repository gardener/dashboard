#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const assert = require('assert').strict
const { findYarnWorkspace, findJestConfig, findYarnCommand } = require('./helper.cjs')

const workspace = findYarnWorkspace(process.argv[3])
assert(workspace, 'yarn workspace not found')

const jestConfig = findJestConfig(workspace)
assert(jestConfig, 'jest configuration not found')
process.argv.push('--config', jestConfig)

const yarnCommand = findYarnCommand()
assert(yarnCommand, 'yarn command not found')

require(yarnCommand)
