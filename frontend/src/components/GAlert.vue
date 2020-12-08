<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-alert
      class="alertBanner"
      :type="type"
      v-model="alertVisible"
      :color="color"
      :transition="transition"
    >
      <v-row align="center">
        <v-col class="grow pa-0">
          <div v-if="message" class="alert-banner-message" v-html="messageHtml"></div>
          <slot v-else name="message"></slot>
        </v-col>
        <v-col class="shrink py-0">
          <v-btn small icon @click="closeBanner"><v-icon>mdi-close-circle</v-icon></v-btn>
        </v-col>
      </v-row>
    </v-alert>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { transformHtml } from '@/utils'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'

const LOCAL_STORE_ALERT_BANNER_HIDDEN_MESSAGES = 'global/alert-banner/hidden-messages'

export default {
  components: {
    ConfirmDialog
  },
  props: {
    message: { // alternatively, use message slot
      type: String
    },
    type: {
      type: String,
      default: 'error'
    },
    identifier: {
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
      const result = await this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Hide',
        captionText: 'Hide Message',
        messageHtml: 'Do you want to hide this message?',
        showDoNotAskAgain: true
      })
      if (!result) {
        return
      }
      const { doNotAskAgain } = result
      if (doNotAskAgain) {
        const permanentlyHiddenIds = this.getPermanentlyHiddenIds()
        permanentlyHiddenIds[this.identifier] = true
        this.$localStorage.setObject(LOCAL_STORE_ALERT_BANNER_HIDDEN_MESSAGES, permanentlyHiddenIds)
      }
      this.setAlertVisibility(false)
    },
    getPermanentlyHiddenIds () {
      return this.$localStorage.getObject(LOCAL_STORE_ALERT_BANNER_HIDDEN_MESSAGES) || {}
    },
    isPermanentlyHidden (identifier) {
      const permanentlyHiddenIds = this.getPermanentlyHiddenIds()
      return permanentlyHiddenIds[this.identifier] === true
    },
    updateAlertVisibility () {
      const visible = !this.isPermanentlyHidden(this.identifier)
      this.setAlertVisibility(visible)
    },
    setAlertVisibility (visible) {
      this.alertVisible = visible
      this.$emit('value', visible)
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
