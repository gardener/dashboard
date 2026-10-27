//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  access,
  mkdir,
  rmdir,
  unlink,
  writeFile,
} from 'fs/promises'
import {
  dirname,
  join,
  resolve,
} from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_FS_PATH = resolve(__dirname, 'public')
const INDEX_FILENAME = join(PUBLIC_FS_PATH, 'index.html')

async function exists (filename) {
  try {
    await access(filename)
    return true
  } catch {
    return false
  }
}

// Creates backend/public/index.html once for the whole run, so that test files
// running in parallel threads never create or remove it themselves.
// Only what was created here is removed again in the teardown.
export async function setup () {
  let createdPublicDir = false
  let createdIndex = false

  if (!await exists(PUBLIC_FS_PATH)) {
    await mkdir(PUBLIC_FS_PATH, { recursive: true })
    createdPublicDir = true
  }
  if (!await exists(INDEX_FILENAME)) {
    await writeFile(INDEX_FILENAME, '<!doctype html><html><body>Gardener Dashboard</body></html>\n')
    createdIndex = true
  }

  return async () => {
    if (createdIndex) {
      await unlink(INDEX_FILENAME).catch(() => undefined)
    }
    if (createdPublicDir) {
      await rmdir(PUBLIC_FS_PATH).catch(() => undefined)
    }
  }
}
