//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { vi, beforeAll, afterAll } from 'vitest'
import fixtures from './__fixtures__/index.js'

beforeAll(() => {
  process.env.HELM_VALUES_DIRNAME = fs.mkdtempSync(path.join(os.tmpdir(), 'helm-'))
})

afterAll(() => {
  const dirname = process.env.HELM_VALUES_DIRNAME
  fs.rmSync(dirname, {
    maxRetries: 100,
    recursive: true,
  })
})

vi.stubGlobal('fixtures', fixtures)
