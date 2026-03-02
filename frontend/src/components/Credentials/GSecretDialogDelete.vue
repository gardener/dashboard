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
            Are you sure to delete the <code>Secret</code> <span class="font-weight-bold">{{ resourceName }} (<code>{{ resourceKind }}</code>)</span>?<br>
            <span class="text-error font-weight-bold">The operation can not be undone.</span>
          </span>
        </v-container>
        <g-message
          v-model:message="errorMessage"
          v-model:detailed-message="detailedErrorMessage"
          color="error"
        />
      </v-card-text>
      <div>
        <v-alert
          :model-value="bindingsWithSameCredential?.length > 0"
          type="info"
          rounded="0"
          class="mb-2"
        >
          <p>
            This secret is also referenced by
          </p>
          <v-chip
            v-for="{ kind, metadata: { uid, name }} in bindingsWithSameCredential"
            :key="uid"
            v-tooltip:top="kind"
            class="mr-2"
            size="small"
            :prepend-icon="kind === 'SecretBinding' ? 'mdi-key' : 'mdi-key-outline'"
          >
            {{ name }}
          </v-chip>
          <p class="mt-2">
            Deleting this {{ resourceKind }} will not delete the referenced secret.
          </p>
        </v-alert>
      </div>
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
import { toRefs } from 'vue'

import { useCredentialStore } from '@/store/credential'

import GMessage from '@/components/GMessage'
import GToolbar from '@/components/GToolbar.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCloudProviderCredential } from '@/composables/credential/useCloudProviderCredential'

import { errorDetailsFromError } from '@/utils/error'

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
    credential: {
      type: Object,
    },
    binding: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props) {
    const { credential, binding } = toRefs(props)
    let credentialComposable = {}
    if (binding.value) {
      credentialComposable = useCloudProviderBinding(binding)
    } else if (credential.value) {
      credentialComposable = useCloudProviderCredential(credential)
    }

    const {
      bindingsWithSameCredential,
      resourceName,
      resourceKind,
      resourceNamespace,
    } = credentialComposable

    return {
      bindingsWithSameCredential,
      resourceName,
      resourceKind,
      resourceNamespace,
    }
  },
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
  },
  watch: {
    modelValue: function (modelValue) {
      if (modelValue) {
        this.reset()
      }
    },
  },
  methods: {
    ...mapActions(useCredentialStore, [
      'deleteDnsCredential',
      'deleteInfraCredential',
    ]),
    hide () {
      this.visible = false
    },
    async onDeleteSecret () {
      try {
        if (this.credential) {
          await this.deleteDnsCredential({
            credentialKind: this.resourceKind,
            credentialNamespace: this.resourceNamespace,
            credentialName: this.resourceName,
          })
        }
        if (this.binding) {
          await this.deleteInfraCredential({
            bindingKind: this.resourceKind,
            bindingNamespace: this.resourceNamespace,
            bindingName: this.resourceName,
          })
        }
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
