<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-dialog
    v-model="visible"
    max-width="800"
    :persistent="loading"
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-alert-outline"
        title="Confirm Delete"
      />
      <v-card-text>
        <v-container fluid>
          <span class="text-body-large">
            <template v-if="deletesCredentialWithBinding">
              Are you sure you want to delete <span class="font-weight-bold">{{ credentialName }}</span> and its associated <code>{{ resourceKind }}</code>?
            </template>
            <template v-else-if="binding">
              Are you sure you want to delete the <code>{{ resourceKind }}</code> <span class="font-weight-bold">{{ resourceName }}</span>?
            </template>
            <template v-else>
              Are you sure you want to delete <span class="font-weight-bold">{{ resourceName }}</span>?
            </template>
            <br>
            <span class="text-error font-weight-bold">The operation cannot be undone.</span>
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
          :disabled="loading"
          @click="visible = false"
        >
          Cancel
        </v-btn>
        <v-btn
          variant="text"
          color="toolbar-background"
          :loading="loading"
          :disabled="loading"
          @click="onDelete"
        >
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from 'pinia'
import { toRefs } from 'vue'

import { useCredentialStore } from '@/store/credential'

import GMessage from '@/components/GMessage.vue'
import GToolbar from '@/components/GToolbar.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useDnsProviderCredential } from '@/composables/credential/useDnsProviderCredential'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: { GMessage, GToolbar },
  inject: ['logger'],
  props: {
    modelValue: { type: Boolean, required: true },
    credential: Object,
    binding: Object,
  },
  emits: ['update:modelValue'],
  setup (props) {
    const { credential, binding } = toRefs(props)
    const composable = binding.value
      ? useCloudProviderBinding(binding)
      : useDnsProviderCredential(credential)
    return {
      resourceName: composable.resourceName,
      resourceKind: composable.resourceKind,
      resourceNamespace: composable.resourceNamespace,
      credentialName: composable.credentialName,
      isOrphanedBinding: composable.isOrphanedBinding,
    }
  },
  data () {
    return {
      detailedErrorMessage: undefined,
      errorMessage: undefined,
      loading: false,
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
    deletesCredentialWithBinding () {
      return Boolean(this.binding && !this.isOrphanedBinding)
    },
  },
  watch: {
    modelValue (value) {
      if (value) {
        this.reset()
      }
    },
  },
  methods: {
    ...mapActions(useCredentialStore, ['deleteDnsCredential', 'deleteInfraCredential']),
    async onDelete () {
      if (this.loading) {
        return
      }
      this.loading = true
      try {
        if (this.credential) {
          await this.deleteDnsCredential({
            credentialKind: this.resourceKind,
            credentialNamespace: this.resourceNamespace,
            credentialName: this.resourceName,
          })
        } else {
          await this.deleteInfraCredential({
            bindingKind: this.resourceKind,
            bindingNamespace: this.resourceNamespace,
            bindingName: this.resourceName,
          })
        }
        this.visible = false
      } catch (err) {
        const details = errorDetailsFromError(err)
        this.errorMessage = `Failed to delete ${this.binding ? 'credential binding' : 'Secret'}.`
        this.detailedErrorMessage = details.detailedMessage
        this.logger.error(this.errorMessage, details.errorCode, details.detailedMessage, err)
      } finally {
        this.loading = false
      }
    },
    reset () {
      this.errorMessage = undefined
      this.detailedErrorMessage = undefined
    },
  },
}
</script>
