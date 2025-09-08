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
            Are you sure to delete the <code>Secret</code> <span class="font-weight-bold">{{ credentialEntity.metadata.name }} (<code>{{ credentialEntity.kind }}</code>)</span>?<br>
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
          :model-value="bindingsWithSameCredential.length > 0"
          type="info"
          rounded="0"
          class="mb-2 list-style"
        >
          This secret is also referenced by
          <ul>
            <li
              v-for="referencedBinding in bindingsWithSameCredential"
              :key="referencedBinding.metadata.uid"
            >
              <pre>{{ referencedBinding.metadata.name }} ({{ (referencedBinding.kind) }})</pre>
            </li>
          </ul>
          Deleting this {{ credentialEntity.kind }} will not delete the referenced secret.
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
import {
  toRef,
  computed,
} from 'vue'

import { useCredentialStore } from '@/store/credential'

import GMessage from '@/components/GMessage'
import GToolbar from '@/components/GToolbar.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCredential } from '@/composables/credential/useCloudProviderCredential'
import {
  isSecretBinding,
  isCredentialsBinding,
} from '@/composables/credential/helper'

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
    credentialEntity: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props) {
    const credential = toRef(props, 'credentialEntity')
    let composable
    if (isSecretBinding(credential.value) || isCredentialsBinding(credential.value)) {
      composable = useCloudProviderBinding(credential)
    } else {
      composable = useCredential(credential)
    }
    const {
      bindingsWithSameCredential = computed(() => []),
    } = composable
    return {
      bindingsWithSameCredential,
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
    ...mapActions(useCredentialStore, ['deleteCredential']),
    hide () {
      this.visible = false
    },
    async onDeleteSecret () {
      try {
        const { kind, metadata: { namespace, name } } = this.credentialEntity
        if (kind === 'Secret' || kind === 'WorkloadIdentity') {
          await this.deleteCredential({
            credentialKind: kind,
            credentialNamespace: namespace,
            credentialName: name,
          })
        } else {
          await this.deleteCredential({
            bindingKind: kind,
            bindingNamespace: namespace,
            bindingName: name,
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

  .list-style {
    ul {
      margin-left: 10px;
    }
    li {
      margin-left: 10px;
    }
  }
</style>
