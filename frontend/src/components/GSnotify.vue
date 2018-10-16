<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
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
      'errorMessage',
      'alertMessage',
      'alertType',
      'isWebsocketConnectionError',
      'websocketConnectAttempt'
    ])
  },
  watch: {
    errorMessage (value) {
      if (value) {
        this.showSnotifyToast(value, 'error')
        this.setError(null)
      }
    },
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
      'setError',
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
        this.websocketConnectionNotification = this.$snotify.warning(this.websocketConnectionNotificationMessage, `No Connection`, {
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
<style lang="styl">
  @import "~vue-snotify/styles/material.css";

  .snotify-rightTop {
    top: 75px;
  }

  .snotify-info {
    background-color: #0097A7; // cyan darken-2
  }

  .snotify {
    width: 400px;
  }
</style>
