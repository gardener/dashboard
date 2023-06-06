//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mapState, mapActions } from 'pinia'

import colors from 'vuetify/lib/util/colors'

import { useShootStore, useSocketStore } from '@/store'
import { constants } from '@/store/shoot/helper'

export const shootSubscription = {
  computed: {
    ...mapState(useShootStore, [
      'subscriptionState',
      'subscriptionError',
      'loading',
      'subscription',
      'subscribed',
      'unsubscribed',
    ]),
    ...mapState(useSocketStore, [
      'readyState',
      'connected',
      'active',
    ]),
    kind () {
      if (this.loading) {
        return this.subscriptionError
          ? this.subscriptionState === constants.LOADING
            ? 'alert-load'
            : 'alert-subscribe'
          : 'progress'
      }
      if (!this.connected) {
        return this.active
          ? 'progress-connect'
          : 'alert-connect'
      }
      return 'ok'
    },
    color () {
      switch (this.kind) {
        case 'alert-connect':
        case 'alert-load':
        case 'alert-subscribe':
          return 'error'
        case 'progress-connect':
          return colors.grey.darken1
        case 'progress':
        default:
          return 'primary'
      }
    },
    message () {
      const name = this.subscription?.name
        ? 'shoot'
        : 'shoots'
      switch (this.kind) {
        case 'alert-connect':
          return 'Establishing real-time server connection failed'
        case 'alert-load':
          return `Loading ${name} failed. Data may be outdated`
        case 'alert-subscribe':
          return `Subscribing ${name} failed. Data may be outdated`
        case 'progress-connect':
          return 'Establishing real-time server connection ...'
        case 'progress':
          return `Subscribing ${name} ...`
        default:
          return this.subscribed
            ? `Successfully loaded and subscribed ${name}`
            : 'Real-time server connected'
      }
    },
    hint () {
      return this.kind.startsWith('alert')
        ? `Pressing the ${this.action.toUpperCase()} button may fix the problem`
        : ''
    },
    action () {
      switch (this.kind) {
        case 'alert-connect':
          return 'reconnect'
        case 'alert-subscribe':
          return 'retry'
        case 'alert-load':
          return 'reload'
        default:
          return ''
      }
    },
  },
  methods: {
    ...mapActions(useShootStore, [
      'synchronize',
    ]),
    ...mapActions(useSocketStore, [
      'connect',
    ]),
    retry () {
      if (!this.connected && !this.active) {
        this.connect()
      } else {
        this.synchronize()
      }
    },
  },
}

export default shootSubscription
