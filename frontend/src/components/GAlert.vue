<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-alert
    class="alertBanner"
    :type="type"
    v-model="alertVisible"
    :color="color"
    :transition="transition"
    @input="closeBanner"
    dismissible
  >
    <div v-if="message" class="alert-banner-message" v-html="messageHtml"></div>
    <slot v-else name="message"></slot>
  </v-alert>
</template>

<script>
import { mapActions } from 'vuex'
import { transformHtml } from '@/utils'

const LOCAL_STORE_ALERT_BANNER_HIDDEN_MESSAGES = 'global/alert-banner/hidden-messages'

export default {
  props: {
    message: { // alternatively, use message slot
      type: String
    },
    type: {
      type: String,
      default: 'error'
    },
    identifier: { // pass identifier to permanently hide the message on close
      type: String
    },
    color: {
      type: String
    },
    transition: {
      type: String
    }
  },
  data () {
    return {
      alertVisible: false
    }
  },
  computed: {
    messageHtml () {
      return transformHtml(this.message)
    }
  },
  methods: {
    ...mapActions([
      'setAlertBanner'
    ]),
    async closeBanner () {
      if (this.identifier) { // hide permanently
        this.hidePermanently(this.identifier)
      }

      this.setAlertVisibility(false)
    },
    hidePermanently (identifier) {
      const permanentlyHiddenIds = this.$localStorage.getObject(LOCAL_STORE_ALERT_BANNER_HIDDEN_MESSAGES) || {}
      permanentlyHiddenIds[identifier] = true
      this.$localStorage.setObject(LOCAL_STORE_ALERT_BANNER_HIDDEN_MESSAGES, permanentlyHiddenIds)
    },
    isPermanentlyHidden (identifier) {
      if (!identifier) {
        return false
      }

      const permanentlyHiddenIds = this.$localStorage.getObject(LOCAL_STORE_ALERT_BANNER_HIDDEN_MESSAGES) || {}
      return permanentlyHiddenIds[this.identifier] === true
    },
    updateAlertVisibility () {
      const visible = (this.$slots.message || !!this.message) && !this.isPermanentlyHidden(this.identifier)
      this.setAlertVisibility(visible)
    },
    setAlertVisibility (visible) {
      this.alertVisible = visible
    }
  },
  mounted () {
    this.updateAlertVisibility()
  },
  watch: {
    identifier (value) {
      this.updateAlertVisibility()
    }
  }
}
</script>

<style lang="scss" scoped>
  .alertBanner {
    margin-top: 0px;
  }
</style>
