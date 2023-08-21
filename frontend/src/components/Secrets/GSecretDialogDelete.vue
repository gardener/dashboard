<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog
    v-model="visible"
    max-width="800"
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-alert-outline"
        title="Confirm Delete"
      />
      <v-card-text>
        <v-container fluid>
          <span class="text-subtitle-1">
            Are you sure to delete the secret <span class="font-weight-bold">{{ name }}</span>?<br>
            <span class="text-error font-weight-bold">The operation can not be undone.</span>
          </span>
        </v-container>
        <g-message
          v-model:message="errorMessage"
          v-model:detailed-message="detailedErrorMessage"
          color="error"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="hide"
        >
          Cancel
        </v-btn>
        <v-btn
          variant="text"
          color="toolbar-background"
          @click="onDeleteSecret"
        >
          Delete Secret
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from 'pinia'

import { useSecretStore } from '@/store/secret'

import GMessage from '@/components/GMessage'
import GToolbar from '@/components/GToolbar.vue'

import { errorDetailsFromError } from '@/utils/error'

import { get } from '@/lodash'

export default {
  components: {
    GMessage,
    GToolbar,
  },
  inject: ['logger'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secret: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
    }
  },
  computed: {
    visible: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
    name () {
      return get(this.secret, 'metadata.name', '')
    },
  },
  watch: {
    modelValue: function (modelValue) {
      if (modelValue) {
        this.reset()
      }
    },
  },
  methods: {
    ...mapActions(useSecretStore, ['deleteSecret']),
    hide () {
      this.visible = false
    },
    async onDeleteSecret () {
      const name = get(this.secret, 'metadata.name')
      try {
        await this.deleteSecret(name)
        this.hide()
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Failed to delete Cloud Provider Secret.'
        this.detailedErrorMessage = errorDetails.detailedMessage
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.errorMessage = undefined
      this.detailedErrorMessage = undefined
    },
  },
}
</script>

<style lang="scss" scoped>
  .icon {
    font-size: 90px;
  }

  .credential_title {
    font-size: 30px;
    font-weight: 400;
  }
</style>
