<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <vue-snotify :class="darkMode ? 'snotify-dark' : 'snotify-light'"></vue-snotify>
</template>

<script>
import { mapGetters, mapState, mapActions } from 'vuex'
import { SnotifyPosition } from 'vue-snotify'

export default {
  data () {
    return {
      websocketConnectionNotification: undefined,
      websocketConnectionNotificationMessage: 'The content on this page might be outdated'
    }
  },
  computed: {
    ...mapState([
      'darkMode'
    ]),
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
  @import "~vue-snotify/styles/material.scss";

  $error-color: var(--v-error-base);
  $warning-color: var(--v-warning-base);
  $success-color: var(--v-success-base);
  $info-color: var(--v-info-base);
  $dark-background: rgba(0, 0, 0, .9);

  .snotify-rightTop {
    top: 75px;
  }

  .snotify {
    width: 400px;
  }

  .snotify-dark {
    .snotify-error {
      background-color: $dark-background !important;
      .snotifyToast__body {
        color: $error-color;
      }
    }
    .snotify-warning {
      background-color: $dark-background !important;
      .snotifyToast__body {
        color: $warning-color;
      }
    }
    .snotify-success {
      background-color: $dark-background !important;
      .snotifyToast__body {
        color: $success-color;
      }
    }
    .snotify-info {
      background-color: $dark-background !important;
      .snotifyToast__body {
        color: $info-color;
      }
    }
  }

  .snotify-light {
    .snotify-error {
      background-color: $error-color !important;
    }
    .snotify-warning {
      background-color: $warning-color !important;
    }
    .snotify-success {
      background-color: $success-color !important;
    }
    .snotify-info {
      background-color: $info-color !important;
    }
  }

</style>
