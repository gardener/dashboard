//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
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
import request from '@gardener-dashboard/request'

const { mockRequest } = request

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_FS_PATH = resolve(__dirname, '../../public')
const INDEX_FILENAME = join(PUBLIC_FS_PATH, 'index.html')

async function exists (filename) {
  try {
    await access(filename)
    return true
  } catch {
    return false
  }
}

describe('caching', function () {
  let agent
  let createdPublicDir = false
  let createdIndex = false

  beforeAll(async () => {
    if (!await exists(PUBLIC_FS_PATH)) {
      await mkdir(PUBLIC_FS_PATH, { recursive: true })
      createdPublicDir = true
    }
    if (!await exists(INDEX_FILENAME)) {
      await writeFile(INDEX_FILENAME, '<!doctype html><html><body>Gardener Dashboard</body></html>\n')
      createdIndex = true
    }

    agent = await createAgent()
  })

  afterAll(async () => {
    agent.close()
    if (createdIndex) {
      await unlink(INDEX_FILENAME).catch(() => undefined)
    }
    if (createdPublicDir) {
      await rmdir(PUBLIC_FS_PATH).catch(() => undefined)
    }
  })

  beforeEach(() => {
    mockRequest.mockReset()
  })

  it('should set etag headers for the SPA fallback', async function () {
    const res = await agent
      .get('/login')
      .set('accept', 'text/html')
      .expect('content-type', /html/)
      .expect(200)

    expect(res.headers).toHaveProperty('etag')
  })

  it('should not set etag headers for api responses', async function () {
    const res = await agent
      .get('/api/info')
      .expect('content-type', /json/)
      .expect(401)

    expect(res.headers).not.toHaveProperty('etag')
  })

  it('should not set etag headers for auth responses', async function () {
    const user = fixtures.auth.createUser({ id: 'john.doe@example.org' })

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())
    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

    const res = await agent
      .post('/auth')
      .send({ token: await user.bearer })
      .expect('content-type', /json/)
      .expect(200)

    expect(res.headers).not.toHaveProperty('etag')
  })

  it('should not set etag headers for webhook error responses', async function () {
    const body = JSON.stringify({ foo: 1 })

    const res = await agent
      .post('/webhook')
      .set('x-github-event', 'unknown_event')
      .set('x-hub-signature-256', fixtures.github.createHubSignature(body))
      .type('application/json')
      .send(body)
      .expect('content-type', /json/)
      .expect(422)

    expect(res.headers).not.toHaveProperty('etag')
  })
})
