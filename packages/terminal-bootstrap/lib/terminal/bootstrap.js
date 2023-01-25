
//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const Queue = require('better-queue')
const _ = require('lodash')

const logger = require('../logger')
const config = require('../config')

const {
  getSeedNameFromShoot,
  seedShootNamespaceExists,
  handleSeed,
  handleShoot,
  ensureTrustedCertForGardenTerminalHostApiServer,
  isTerminalBootstrapDisabled,
  isTerminalBootstrapDisabledForKind,
  verifyRequiredConfigExists,
  taskIdForResource,
  bootstrapRevision
} = require('./utils')

const BootstrapReasonEnum = {
  IRRELEVANT: 0,
  NOT_BOOTSTRAPPED: 1,
  REVISION_CHANGED: 2
}

const BootstrapStatusEnum = {
  INITIAL: 0,
  POSTPONED: 1,
  BOOTSTRAPPED: 2,
  IN_PROGRESS: 3,
  FAILED: 4
}

// acts as abstract class
class BootstrapMap extends Map {
  removeResource (resource) {
    const key = this.getKey(resource)
    this.delete(key)
  }

  setSucceeded (item, { revision }) {
    const key = this.getKey(item)
    const value = {
      state: BootstrapStatusEnum.BOOTSTRAPPED,
      revision
    }
    this.set(key, value)
  }

  setBootstrapRequired (item) {
    const key = this.getKey(item)
    const currentValue = this.getValue(key)
    const value = {
      state: BootstrapStatusEnum.INITIAL,
      revision: undefined // reset revision
    }
    // keep failure in case there is any
    if (currentValue.failure) {
      value.failure = currentValue.failure
    }
    this.set(key, value)
  }

  setFailed (item, doNotRetry) {
    const key = this.getKey(item)
    const currentValue = this.getValue(key)
    const failureCounter = _.get(currentValue, 'failure.counter', 0)
    const value = {
      state: BootstrapStatusEnum.FAILED,
      revision: currentValue.revision, // keep previous revision, in case handleDependentShoots needs to be triggered
      failure: {
        date: new Date(),
        counter: failureCounter + 1,
        doNotRetry
      }
    }
    this.set(key, value)
  }

  setInProgress (item) {
    const key = this.getKey(item)
    const value = this.getValue(key)
    value.state = BootstrapStatusEnum.IN_PROGRESS
    this.set(key, value)
  }

  setPostponed (item) {
    const key = this.getKey(item)
    const value = this.getValue(key)
    value.state = BootstrapStatusEnum.POSTPONED
    this.set(key, value)
  }

  getValue (item) {
    const key = this.getKey(item)
    return this.has(key)
      ? this.get(key)
      : { state: BootstrapStatusEnum.INITIAL }
  }

  getKey (item) {
    return typeof item === 'string'
      ? item
      : item.metadata.uid
  }
}

class Handler {
  #run
  #description

  constructor (fn, { id, description }) {
    this.id = id
    this.#run = fn
    this.#description = description
    this.session = {
      canceled: false
    }
  }

  run () {
    return this.#run(this.session)
  }

  cancel () {
    logger.debug(`Cancel called on Handler ${this.description}`)
    this.session.canceled = true
  }

  get description () {
    return this.#description
  }
}

class Bootstrapper extends Queue {
  constructor (client, processFn = Bootstrapper.process, options = Bootstrapper.options) {
    super(processFn, options)
    this.client = client
    this.bootstrapState = new BootstrapMap()
    this.requiredConfigExists = verifyRequiredConfigExists()
    if (this.isBootstrapKindAllowed('gardenTerminalHost')) {
      const id = 'gardenTerminalHost'
      const description = 'garden host cluster'
      const fn = () => ensureTrustedCertForGardenTerminalHostApiServer(this.client)
      const handler = new Handler(fn, { id, description })
      this.push(handler)
    }
  }

  isBootstrapKindAllowed (kind) {
    if (isTerminalBootstrapDisabled()) {
      return false
    }
    if (isTerminalBootstrapDisabledForKind(kind)) {
      return false
    }
    if (!this.requiredConfigExists) {
      return false
    }
    return true
  }

  handleResourceEvent ({ type, object }) {
    switch (type) {
      case 'ADDED': {
        this.bootstrapResource(object)
        break
      }
      case 'MODIFIED': {
        this.bootstrapResource(object)
        break
      }
      case 'DELETED': {
        this.cancelTask(object)
        break
      }
    }
  }

  cancelTask (object) {
    const taskId = taskIdForResource(object)
    this.cancel(taskId)
    this.bootstrapState.removeResource(object)
  }

  bootstrapStatus (resource) {
    const { kind, metadata: { namespace, name, uid } } = resource

    const qualifiedName = namespace ? namespace + '/' + name : name
    const description = `${kind} - ${qualifiedName} (${uid})`

    if (!this.isBootstrapKindAllowed(kind)) {
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    // do not bootstrap if resource is being deleted
    if (!_.isEmpty(resource.metadata.deletionTimestamp)) {
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    const isBootstrapDisabledForResource = _.get(resource, ['metadata', 'annotations', 'dashboard.gardener.cloud/terminal-bootstrap-disabled'], 'false') === 'true'
    if (isBootstrapDisabledForResource) {
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    const value = this.bootstrapState.getValue(resource)

    if (value.state === BootstrapStatusEnum.IN_PROGRESS) { // task already running or in queue, can ignore
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    if (value.failure) { // failed previously
      if (value.failure.doNotRetry) {
        return {
          required: false,
          reason: BootstrapReasonEnum.IRRELEVANT
        }
      }

      const lastFailure = value.failure.date.getTime()
      const multiplier = Math.min(value.failure.counter * 2, 24)
      const needsWait = Date.now() - lastFailure <= multiplier * 60 * 60 * 1000
      if (needsWait) {
        return {
          required: false,
          reason: BootstrapReasonEnum.IRRELEVANT
        }
      }
    }

    // for shoots, if the seed-shoot-ns does not exist, postpone bootstrapping
    if (kind === 'Shoot' && !seedShootNamespaceExists(resource)) {
      if (value.state === BootstrapStatusEnum.INITIAL) {
        logger.debug(`bootstrapping of ${description} postponed`)
        this.bootstrapState.setPostponed(resource)
      }
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    if (!value.revision) { // not yet bootstrapped
      return {
        required: true,
        reason: BootstrapReasonEnum.NOT_BOOTSTRAPPED
      }
    }

    if (kind === 'Seed') {
      if (value.revision !== bootstrapRevision(resource)) { // revision changed
        logger.debug(`terminal bootstrap revision changed for ${description}. Needs bootstrap`)
        return {
          required: true,
          reason: BootstrapReasonEnum.REVISION_CHANGED
        }
      }
    }

    // already bootstrapped
    return {
      required: false,
      reason: BootstrapReasonEnum.IRRELEVANT
    }
  }

  bootstrapResource (resource) {
    const { kind, metadata: { namespace, name, uid } } = resource

    const qualifiedName = namespace ? namespace + '/' + name : name
    const description = `${kind} - ${qualifiedName} (${uid})`

    const { required, reason } = this.bootstrapStatus(resource)
    if (!required) {
      return
    }

    const key = this.bootstrapState.getKey(resource)
    this.bootstrapState.setInProgress(key)

    const taskId = taskIdForResource(resource)
    const fn = async session => {
      try {
        if (session.canceled) {
          logger.debug(`Canceling handler of ${description} as requested`)
          this.bootstrapState.delete(key) // tasks are canceled only for deleted resources, hence remove from state
          return
        }

        let seed
        switch (kind) {
          case 'Seed': {
            seed = await this.client['core.gardener.cloud'].seeds.get(name)
            await handleSeed(this.client, seed)
            if (reason === BootstrapReasonEnum.REVISION_CHANGED) {
              await this.handleDependentShoots(name)
            }
            break
          }
          case 'Shoot': {
            const shoot = await this.client['core.gardener.cloud'].shoots.get(namespace, name)
            const seedName = getSeedNameFromShoot(shoot)
            seed = await this.client['core.gardener.cloud'].seeds.get(seedName)
            await handleShoot(this.client, shoot, seed)
            break
          }
          default: {
            logger.error(`can't bootstrap unsupported kind ${kind}`)
            this.bootstrapState.setFailed(key, true)
            return
          }
        }

        if (session.canceled) { // do not add key to the bootstrapped set when the session is canceled (due to shoot deletion) to prevent leaking memory
          logger.debug(`Canceling handler of ${description} as requested after handling resource`)
          this.bootstrapState.delete(key) // tasks are canceled only for deleted resources, hence remove from state
          return
        }

        logger.debug(`Successfully bootstrapped ${description}`)
        const revision = bootstrapRevision(seed)
        this.bootstrapState.setSucceeded(key, { revision })
      } catch (err) {
        if (session.canceled) { // do not add key to the bootstrapped set when the session is canceled (due to shoot deletion) to prevent leaking memory
          logger.debug(`Handler canceled of ${description}`)
          this.bootstrapState.delete(key) // tasks are canceled only for deleted resources, hence remove from state
        } else {
          this.bootstrapState.setFailed(key, false)
        }
        throw err
      }
    }
    const handler = new Handler(fn, {
      id: taskId, // with the id we make sure that the task for one shoot is not added multiple times (e.g. on another ADDED event when the shoot watch is re-established)
      description
    })

    this.push(handler)
  }

  async handleDependentShoots (seedName) {
    const query = {
      fieldSelector: `spec.seedName=${seedName}`
    }
    const { items } = await this.client['core.gardener.cloud'].shoots.listAllNamespaces(query)
    logger.debug(`Bootstrap required for ${items.length} shoots due to terminal bootstrap revision change`)
    _.forEach(items, shoot => {
      shoot.kind = 'Shoot' // patch missing kind
      this.bootstrapState.setBootstrapRequired(shoot)
      this.bootstrapResource(shoot)
    })
  }

  static get options () {
    const defaultOptions = {
      maxTimeout: 600000 // 10 minutes
    }
    const configOptions = _
      .chain(config)
      .get('terminal.bootstrap.queueOptions', {})
      .cloneDeep()
      .value()
    return _.assign(defaultOptions, configOptions)
  }

  static process (handler, cb) {
    const runHandler = async () => {
      try {
        await handler.run()
        cb(null, null)
      } catch (err) {
        logger.error(`failed to bootstrap ${handler.description}`, err)
        cb(err, null)
      }
    }
    process.nextTick(runHandler)
    return handler // handler implements cancel function
  }
}

module.exports = {
  Handler,
  Bootstrapper,
  BootstrapStatusEnum,
  BootstrapReasonEnum
}
