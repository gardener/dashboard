//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
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

// Creates backend/public/index.html once for the whole run, so that test files
// running in parallel threads never create or remove it themselves.
// Only what was created here is removed again in the teardown.
export async function setup () {
  let createdPublicDir = false
  let createdIndex = false

  // Create exclusively, so that a directory or file made by someone else is never claimed
  try {
    await mkdir(PUBLIC_FS_PATH)
    createdPublicDir = true
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
  try {
    await writeFile(INDEX_FILENAME, '<!doctype html><html><body>Gardener Dashboard</body></html>\n', { flag: 'wx' })
    createdIndex = true
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
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
