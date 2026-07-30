#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { main } from './local-dashboard/internal/commands.mjs'

export { main }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(`local-dashboard: ${error.message}`)
    process.exitCode = 1
  })
}
