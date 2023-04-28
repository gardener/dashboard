<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    :valid="valid"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="450"
    caption="Configure Purpose">
    <template v-slot:actionComponent>
      <purpose
        :secret="secret"
        @update-purpose="onUpdatePurpose"
        @valid="onPurposeValid"
        ref="purpose"
        v-on="$purpose.hooks"
      ></purpose>
    </template>
  </action-button-dialog>
</template>

<script>
import { mapGetters } from 'vuex'
import find from 'lodash/find'

import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'

import { updateShootPurpose } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'

import shootItem from '@/mixins/shootItem'
import asyncRef from '@/mixins/asyncRef'

const Purpose = () => import('@/components/Purpose.vue')

export default {
  name: 'purpose-configuration',
  components: {
    ActionButtonDialog,
    Purpose
  },
  mixins: [
    shootItem,
    asyncRef('purpose')
  ],
  data () {
    return {
      purpose: undefined,
      purposeValid: false
    }
  },
  computed: {
    ...mapGetters([
      'infrastructureSecretList'
    ]),
    valid () {
      return this.purposeValid
    },
    secret () {
      const secrets = this.infrastructureSecretList
      const secret = find(secrets, ['metadata.name', this.shootSecretBindingName])
      if (!secret) {
        console.error('Secret must not be undefined')
      }
      return secret
    }
  },
  methods: {
    onPurposeValid (value) {
      this.purposeValid = value
    },
    onUpdatePurpose (purpose) {
      this.purpose = purpose
    },
    async onConfigurationDialogOpened () {
      await this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await updateShootPurpose({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            purpose: this.purpose
          }
        })
      } catch (err) {
        const errorMessage = 'Could not update purpose'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async reset () {
      this.purpose = this.shootPurpose
      await this.$purpose.dispatch('setPurpose', this.purpose)
    }
  }
}
</script>
