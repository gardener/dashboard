//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, padStart } = require('lodash')
const { WatchBuilder, createMockWatch } = require('@gardener-dashboard/kube-client')
const { mockRequest } = require('@gardener-dashboard/request')
const { converter } = require('../../lib/services/terminals')
const fixtures = require('../../__fixtures__')
const { fromBase64, hash } = fixtures.helper

function getTerminalName (target, identifier) {
  return [
    'term',
    target,
    padStart(identifier, 5, '0')
  ].join('-')
}

function getKubeApiServer (seed, { namespace = 'garden', name } = {}) {
  return [
    !name ? 'k-g' : 'k-' + hash(name, namespace),
    seed.spec.dns.ingressDomain
  ].join('.')
}

describe('api', function () {
  let agent

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    mockRequest.mockReset()
  })

  describe('terminals', function () {
    /* eslint-disable no-unused-vars */
    const admin = fixtures.auth.createUser({ id: 'admin@example.org' })
    const namespace = 'garden-foo'

    let makeSanitizedHtmlStub

    beforeEach(function () {
      makeSanitizedHtmlStub = jest.spyOn(converter, 'makeSanitizedHtml').mockImplementation(text => text)
    })

    describe('shortcuts', function () {
      it('should list the project terminal shortcuts', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get({
          valid: true,
          invalid: true
        }))

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'listProjectTerminalShortcuts',
            params: {
              coordinate: {
                namespace
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(2)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should return empty shortcut list for invalid shortcuts', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get({
          valid: false,
          invalid: true
        }))

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'listProjectTerminalShortcuts',
            params: {
              coordinate: {
                namespace
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(2)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should return empty shortcut list for non existing secret', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get({
          valid: false,
          invalid: false
        }))

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'listProjectTerminalShortcuts',
            params: {
              coordinate: {
                namespace
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(2)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })
    })

    describe('garden', function () {
      const target = 'garden'
      const identifier = '1'

      const name = getTerminalName(target, identifier)
      const terminal = fixtures.terminals.get(namespace, name)
      const hostNamespace = terminal.spec.host.namespace

      it('should create a terminal resource', async function () {
        const identifier = '21'

        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.list())
        mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.create())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'create',
            params: {
              identifier,
              coordinate: {
                namespace,
                target
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(makeSanitizedHtmlStub).toBeCalledTimes(1)
        expect(makeSanitizedHtmlStub.mock.calls).toEqual([['Dummy Image Description']])

        expect(mockRequest).toBeCalledTimes(5)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should reuse a terminal session', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.list())
        mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.patch())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'create',
            params: {
              identifier,
              coordinate: {
                namespace,
                target
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(makeSanitizedHtmlStub).toBeCalledTimes(1)
        expect(makeSanitizedHtmlStub.mock.calls).toEqual([['Foo Image Description']])

        expect(mockRequest).toBeCalledTimes(5)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should fetch a terminal resource', async function () {
        const serviceAccountName = terminal.status.attachServiceAccountName
        const serviceAccount = fixtures.serviceaccounts.create({
          namespace: hostNamespace,
          name: serviceAccountName,
          createdBy: 'admin@example.org'
        })

        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())

        createMockWatch('terminals').mockImplementation(mockWatch => {
          mockWatch.emit('event', {
            type: 'ADDED',
            object: cloneDeep(terminal)
          })
        })

        createMockWatch('serviceaccounts').mockImplementation(mockWatch => {
          mockWatch.emit('event', {
            type: 'ADDED',
            object: cloneDeep(serviceAccount)
          })
        })

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'fetch',
            params: {
              name,
              namespace
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(WatchBuilder.create).toBeCalledTimes(2)
        expect(WatchBuilder.create.mock.calls).toMatchSnapshot()

        expect(mockRequest).toBeCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should read the terminal config', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'config',
            params: {
              coordinate: {
                namespace,
                target
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should keep a terminal resource alive', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.patch())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'heartbeat',
            params: {
              name,
              namespace
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should delete a terminal resource', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.delete())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'remove',
            params: {
              name,
              namespace
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })
    })

    describe('cp', function () {
      const target = 'cp'
      const identifier = '2'
      const shootName = 'fooShoot'

      it('should create a terminal resource', async function () {
        const identifier = '21'

        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.list())
        mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.create())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'create',
            params: {
              identifier,
              coordinate: {
                name: shootName,
                namespace,
                target
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(makeSanitizedHtmlStub).toBeCalledTimes(1)
        expect(makeSanitizedHtmlStub.mock.calls).toEqual([['Dummy Image Description']])

        expect(mockRequest).toBeCalledTimes(6)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should read the terminal config', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'config',
            params: {
              coordinate: {
                name: shootName,
                namespace,
                target
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should keep a terminal resource alive', async function () {
        const name = getTerminalName(target, identifier)

        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.patch())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'heartbeat',
            params: {
              name,
              namespace
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })
    })

    describe('shoot', function () {
      const target = 'shoot'
      const identifier = '3'
      const shootName = 'fooShoot'

      it('should create a terminal resource', async function () {
        const identifier = '21'

        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.list())
        mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.create())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'create',
            params: {
              identifier,
              coordinate: {
                name: shootName,
                namespace,
                target
              },
              preferredHost: 'shoot'
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(makeSanitizedHtmlStub).toBeCalledTimes(1)
        expect(makeSanitizedHtmlStub.mock.calls).toEqual([['Dummy Image Description']])

        expect(mockRequest).toBeCalledTimes(5)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should reuse a terminal session', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.list())
        mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.patch())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'create',
            params: {
              identifier,
              coordinate: {
                name: shootName,
                namespace,
                target
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(makeSanitizedHtmlStub).toBeCalledTimes(1)
        expect(makeSanitizedHtmlStub.mock.calls).toEqual([['Foo Image Description']])

        expect(mockRequest).toBeCalledTimes(5)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })

      it('should read the terminal config', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
        mockRequest.mockImplementationOnce(fixtures.nodes.mocks.list())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'config',
            params: {
              coordinate: {
                name: shootName,
                namespace,
                target
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })
    })

    describe('all', function () {
      it('should list terminal resources', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.terminals.mocks.list())

        const res = await agent
          .post('/api/terminals')
          .set('cookie', await admin.cookie)
          .send({
            method: 'list',
            params: {
              coordinate: {
                namespace
              }
            }
          })
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toBeCalledTimes(2)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(res.body).toMatchSnapshot()
      })
    })
  })
})
