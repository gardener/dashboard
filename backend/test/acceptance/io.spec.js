//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const { filter, map, keys } = require('lodash')

const kubernetesClient = require('../../lib/kubernetes-client')
const io = require('../../lib/io')
const watches = require('../../lib/watches')
const { projects, shoots, authorization } = require('../../lib/services')

module.exports = function ({ sandbox, auth }) {
  /* eslint no-unused-expressions: 0 */

  const username = 'foo@example.org'
  const id = username
  const user = auth.createUser({ id })

  let bearer
  let client = {}
  let createClientStub
  let isAdminStub
  let listProjectsStub
  let listShootsStub
  let sockets = {}
  let server
  let ioServer

  const projectList = [
    { metadata: { namespace: 'foo' } },
    { metadata: { namespace: 'bar' } }
  ]

  const shootList = [
    { metadata: { namespace: 'foo', name: 'foo' } },
    { metadata: { namespace: 'foo', name: 'bar' } },
    { metadata: { namespace: 'foo', name: 'baz' } },
    { metadata: { namespace: 'bar', name: 'foo' } }
  ]

  function setupIoServer (server) {
    try {
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
      ioServer.attach(server)
    } finally {
      sandbox.restore()
    }
  }

  async function connect (key) {
    const { address: hostname, port } = server.address()
    const origin = `http://[${hostname}]:${port}`
    const cookie = await user.cookie
    bearer = await user.bearer
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
    client = {}
    createClientStub = sandbox.stub(kubernetesClient, 'createClient')
      .callsFake(() => client)
    isAdminStub = sandbox.stub(authorization, 'isAdmin')
    listProjectsStub = sandbox.stub(projects, 'list')
    listShootsStub = sandbox.stub(shoots, 'list')
    sockets = await Promise.all(['shoots', 'journals'].map(connect))
    expect(sockets).to.have.length(2)
    for (const socket of sockets) {
      expect(socket.connected).to.be.true
    }
    expect(createClientStub).to.be.calledTwice
    expect(createClientStub).to.be.calledWith({ auth: { bearer } })
  })

  afterEach(function () {
    for (const socket of sockets) {
      if (socket.connected) {
        socket.disconnect()
      }
    }
  })

  it('should subscribe shoots', async function () {
    listProjectsStub.callsFake(() => projectList)
    listShootsStub.callsFake(({ namespace }) => {
      const items = filter(shootList, ['metadata.namespace', namespace])
      return { items }
    })
    const socket = sockets[0]
    const namespaces = [{ namespace: 'foo' }]
    socket.emit('subscribeShoots', { namespaces })
    const namespacedEvent = await pEvent(socket, 'namespacedEvents', {
      timeout: 1000,
      rejectionEvents: ['error', 'subscription_error']
    })
    expect(isAdminStub).to.not.be.called
    expect(listProjectsStub).to.be.calledOnce
    expect(listShootsStub).to.be.calledOnce
    expect(keys(namespacedEvent.namespaces)).to.eql(['foo'])
    expect(map(namespacedEvent.namespaces.foo, 'object')).to.eql(filter(shootList, ['metadata.namespace', 'foo']))
  })

  it('should subscribe all shoots', async function () {
    isAdminStub.callsFake(() => true)
    listProjectsStub.callsFake(() => projectList)
    listShootsStub.callsFake(({ namespace }) => {
      const items = shootList
      return { items }
    })
    const socket = sockets[0]
    socket.emit('subscribeAllShoots', { })
    const namespacedEvent = await pEvent(socket, 'namespacedEvents', {
      timeout: 1000,
      rejectionEvents: ['error', 'subscription_error']
    })
    expect(isAdminStub).to.be.calledOnce
    expect(listProjectsStub).to.be.calledOnce
    expect(listShootsStub).to.be.calledOnce
    const namespaces = ['foo', 'bar']
    expect(keys(namespacedEvent.namespaces)).to.eql(namespaces)
    for (const key of namespaces) {
      expect(map(namespacedEvent.namespaces[key], 'object')).to.eql(filter(shootList, ['metadata.namespace', key]))
    }
  })
}
