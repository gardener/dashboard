<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <vue-snotify></vue-snotify>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { SnotifyPosition } from 'vue-snotify'

export default {
  data () {
    return {
      websocketConnectionNotification: undefined,
      websocketConnectionNotificationMessage: 'The content on this page might be outdated'
    }
  },
  computed: {
    ...mapGetters([
      'alertMessage',
      'alertType',
      'isWebsocketConnectionError',
      'websocketConnectAttempt'
    ])
  },
  watch: {
    alertMessage (value) {
      if (value) {
        this.showSnotifyToast(value, this.alertType)
        this.setAlert(null)
      }
    },
    isWebsocketConnectionError (value) {
      if (value === true) {
        this.showWebsocketConnectionError()
      } else {
        this.removeWebsocketConnectionError()
      }
    },
    websocketConnectAttempt (value) {
      if (this.websocketConnectionNotification) {
        if (value > 0) {
          this.websocketConnectionNotification.body = `${this.websocketConnectionNotificationMessage}. Reconnect attempt ${this.websocketConnectAttempt}`
        } else {
          this.websocketConnectionNotification.body = this.websocketConnectionNotificationMessage
        }
      }
    }
  },
  methods: {
    ...mapActions([
      'setAlert'
    ]),
    showSnotifyToast (message, type) {
      const config = {
        position: SnotifyPosition.rightBottom,
        timeout: 5000,
        showProgressBar: false
      }
      switch (type) {
        case 'success':
          config.timeout = 3000
          this.$snotify.success(message, config)
          break
        case 'warning':
          this.$snotify.warning(message, config)
          break
        case 'info':
          this.$snotify.info(message, config)
          break
        default:
          this.$snotify.error(message, config)
      }
    },
    showWebsocketConnectionError () {
      if (!this.websocketConnectionNotification) {
        this.websocketConnectionNotification = this.$snotify.warning(this.websocketConnectionNotificationMessage, 'No Connection', {
          timeout: 0,
          closeOnClick: false,
          position: SnotifyPosition.rightTop
        })
      }
    },
    removeWebsocketConnectionError () {
      if (this.websocketConnectionNotification) {
        this.$snotify.remove(this.websocketConnectionNotification.id)
      }
      this.websocketConnectionNotification = undefined
    }
  }
}
</script>
<style lang="scss">
  @import '~vuetify/src/styles/styles.sass';
  @import "~vue-snotify/styles/material.css";

  .snotify-rightTop {
    top: 75px;
  }

  .snotify-info {
    background-color: map-get($cyan, 'darken-2');
  }

  .snotify {
    width: 400px;
  }
</style>
