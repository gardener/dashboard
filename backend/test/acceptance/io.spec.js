//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const ioClient = require('socket.io-client')
const http = require('http')
const pEvent = require('p-event')
const { filter, map, pick, groupBy, find, includes } = require('lodash')

const kubernetesClient = require('../../lib/kubernetes-client')
const io = require('../../lib/io')
const watches = require('../../lib/watches')
const cache = require('../../lib/cache')
const { projects, shoots, authorization, tickets } = require('../../lib/services')

module.exports = function ({ sandbox, auth }) {
  /* eslint no-unused-expressions: 0 */

  const username = 'foo@example.org'
  const id = username
  const user = auth.createUser({ id })

  let socket
  let server
  let ioServer

  const client = {}
  const ticketCache = {
    issues: [],
    getIssues () {
      return this.issues
    },
    getIssueNumbersForNameAndProjectName ({ projectName, name }) {
      const issues = filter(this.issues, { projectName, name })
      return map(issues, 'id')
    }
  }
  let createClientStub
  let isAdminStub

  function setupIoServer (server) {
    try {
      const getTicketCacheStub = sandbox.stub(cache, 'getTicketCache').returns(ticketCache)
      const stubs = {}
      for (const key of Object.keys(watches)) {
        stubs[key] = sandbox.stub(watches, key)
      }
      ioServer = io()
      for (const stub of Object.values(watches)) {
        expect(stub).to.be.calledOnce
        expect(stub.firstCall.args).to.have.length(1)
        expect(stub.firstCall.args[0]).to.be.equal(ioServer)
      }
      expect(getTicketCacheStub).to.be.calledOnce
      ioServer.attach(server)
    } finally {
      sandbox.restore()
    }
  }

  async function connect (key) {
    const { address: hostname, port } = server.address()
    const origin = `http://[${hostname}]:${port}`
    const cookie = await user.cookie
    const socket = ioClient(origin + '/' + key, {
      path: '/api/events',
      extraHeaders: { cookie },
      reconnectionDelay: 0,
      forceNew: true,
      autoConnect: false,
      transports: ['websocket']
    })
    socket.connect()
    await pEvent(socket, 'connect', {
      timeout: 1000,
      rejectionEvents: ['error', 'connect_error']
    })
    return socket
  }

  before(async function () {
    server = http.createServer()
    server.listen(0, 'localhost')
    await pEvent(server, 'listening', {
      timeout: 1000
    })
    setupIoServer(server)
  })

  after(function () {
    server.close()
    if (ioServer) {
      ioServer.close()
    }
  })

  beforeEach(async function () {
    createClientStub = sandbox.stub(kubernetesClient, 'createClient').returns(client)
    isAdminStub = sandbox.stub(authorization, 'isAdmin')
  })

  afterEach(function () {
    if (socket.connected) {
      socket.disconnect()
    }
  })

  const projectList = [
    { metadata: { namespace: 'foo', name: 'foo' } },
    { metadata: { namespace: 'bar', name: 'bar' } }
  ]
  describe('shoots', function () {
    const shootList = [
      { metadata: { namespace: 'foo', name: 'foo' } },
      { metadata: { namespace: 'foo', name: 'bar' } },
      { metadata: { namespace: 'foo', name: 'baz' } },
      { metadata: { namespace: 'bar', name: 'foo' } }
    ]

    async function emitSubscribe (...args) {
      const asyncIterator = pEvent.iterator(socket, 'namespacedEvents', {
        timeout: 1000,
        resolutionEvents: ['shootSubscriptionDone', 'batchNamespacedEventsDone'],
        rejectionEvents: ['error', 'subscription_error']
      })
      socket.emit(...args)
      const shootsByNamespace = {}
      for await (const namespacedEvent of asyncIterator) {
        for (const [key, items] of Object.entries(namespacedEvent.namespaces)) {
          shootsByNamespace[key] = (shootsByNamespace[key] || []).concat(map(items, 'object'))
        }
      }
      return shootsByNamespace
    }

    let listProjectsStub
    let listShootsStub
    let readShootStub

    beforeEach(async function () {
      listProjectsStub = sandbox.stub(projects, 'list')
      listShootsStub = sandbox.stub(shoots, 'list')
      readShootStub = sandbox.stub(shoots, 'read')
      socket = await connect('shoots')
      expect(socket.connected).to.be.true
      expect(createClientStub).to.be.calledOnce
      const bearer = await user.bearer
      expect(createClientStub).to.be.calledWith({ auth: { bearer } })
    })

    it('should subscribe shoots for a namespace', async function () {
      listProjectsStub.callsFake(() => projectList)
      listShootsStub.callsFake(({ namespace }) => {
        const items = filter(shootList, ['metadata.namespace', namespace])
        return { items }
      })
      const shootsByNamespace = await emitSubscribe('subscribeShoots', {
        namespaces: [{ namespace: 'foo' }]
      })
      expect(isAdminStub).to.not.be.called
      expect(listProjectsStub).to.be.calledOnce
      expect(listShootsStub).to.be.calledOnce
      expect(shootsByNamespace).to.eql(pick(groupBy(shootList, 'metadata.namespace'), 'foo'))
    })

    it('should subscribe shoots for all namespaces', async function () {
      isAdminStub.callsFake(() => false)
      listProjectsStub.callsFake(() => projectList)
      listShootsStub.callsFake(({ namespace }) => {
        const items = filter(shootList, ['metadata.namespace', namespace])
        return { items }
      })
      const shootsByNamespace = await emitSubscribe('subscribeAllShoots', {})
      expect(isAdminStub).to.be.calledOnce
      expect(listProjectsStub).to.be.calledOnce
      expect(listShootsStub).to.be.calledTwice
      expect(shootsByNamespace).to.eql(groupBy(shootList, 'metadata.namespace'))
    })

    it('should subscribe shoots for all namespaces as admin', async function () {
      isAdminStub.callsFake(() => true)
      listProjectsStub.callsFake(() => projectList)
      listShootsStub.callsFake(() => {
        const items = shootList
        return { items }
      })
      const shootsByNamespace = await emitSubscribe('subscribeAllShoots', {})
      expect(isAdminStub).to.be.calledOnce
      expect(listProjectsStub).to.be.calledOnce
      expect(listShootsStub).to.be.calledOnce
      expect(shootsByNamespace).to.eql(groupBy(shootList, 'metadata.namespace'))
    })

    it('should subscribe single shoot', async function () {
      listProjectsStub.callsFake(() => projectList)
      readShootStub.callsFake(({ namespace, name }) => {
        return find(shootList, { metadata: { namespace, name } })
      })
      const metadata = {
        namespace: 'foo',
        name: 'bar'
      }
      const event = await new Promise(resolve => socket.emit('subscribeShoot', metadata, resolve))
      expect(isAdminStub).to.not.be.called
      expect(readShootStub).to.be.calledOnce
      expect(listShootsStub).to.not.be.called
      expect(event).to.eql({
        type: 'ADDED',
        object: find(shootList, { metadata })
      })
    })
  })

  describe('tickets', function () {
    const issues = [
      { id: 1, namespace: 'foo', name: 'bar' },
      { id: 2, namespace: 'foo', name: 'baz' },
      { id: 3, namespace: 'foo', name: 'bar' }
    ]

    const comments = [
      { id: 1, issue: 1 },
      { id: 2, issue: 2 },
      { id: 3, issue: 1 },
      { id: 4, issue: 2 },
      { id: 5, issue: 3 },
      { id: 6, issue: 3 }
    ]

    async function emitSubscribe (...args) {
      const asyncIterator = pEvent.iterator(socket, 'events', {
        timeout: 1000,
        resolutionEvents: ['batchEventsDone'],
        rejectionEvents: ['error', 'subscription_error']
      })
      socket.emit(...args)
      let items = []
      for await (const { events } of asyncIterator) {
        items = items.concat(map(events, 'object'))
      }
      return items
    }

    let getIssueCommentsStub
    let findProjectByNamespaceStub

    beforeEach(async function () {
      findProjectByNamespaceStub = sandbox.stub(cache, 'findProjectByNamespace')
      ticketCache.issues = issues
      getIssueCommentsStub = sandbox.stub(tickets, 'getIssueComments')
        .callsFake(({ number }) => filter(comments, ['issue', number]))
      socket = await connect('tickets')
      expect(socket.connected).to.be.true
      expect(createClientStub).to.be.calledOnce
      const bearer = await user.bearer
      expect(createClientStub).to.be.calledWith({ auth: { bearer } })
    })

    it('should subscribe tickets', async function () {
      const actualIssues = await emitSubscribe('subscribeIssues')
      expect(actualIssues).to.eql(issues)
    })

    it('should subscribe ticket comments', async function () {
      const name = 'bar'
      const namespace = 'foo'
      const projectName = 'foo'

      findProjectByNamespaceStub.callsFake(namespace => find(projectList, ['metadata.namespace', namespace]))
      const issueComments = await emitSubscribe('subscribeComments', { namespace, name })
      const numbers = map(filter(issues, { projectName, name }), 'id')
      expect(getIssueCommentsStub).to.have.callCount(numbers.length)
      const predicate = ({ issue: id }) => includes(numbers, id)
      expect(issueComments).to.eql(filter(comments, predicate))
    })
  })
}
