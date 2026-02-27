<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog
    v-model="visible"
    max-width="850"
    scrollable
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-account-plus"
        :title="title"
      >
        <template #append>
          <v-btn
            variant="text"
            size="small"
            icon="mdi-help"
            :class="helpVisible ? 'toolbar-title text-toolbar' : 'toolbar text-toolbar-title'"
            @click="helpVisible = !helpVisible"
          />
        </template>
      </g-toolbar>
      <v-card-text>
        <div class="d-flex flex-row pa-3">
          <div
            ref="secretDetails"
            class="d-flex flex-column flex-grow-1"
          >
            <div>
              <template v-if="isCreateMode">
                <v-text-field
                  ref="name"
                  v-model.trim="name"
                  color="primary"
                  label="Secret Name"
                  :error-messages="getErrorMessages(v$.name)"
                  variant="underlined"
                  @update:model-value="v$.name.$touch()"
                  @blur="v$.name.$touch()"
                />
              </template>
              <template v-else>
                <div class="text-h6 pb-4">
                  {{ resourceName }} ({{ resourceKind }})
                </div>
              </template>
            </div>
            <slot name="secret-slot" />
            <g-message
              v-model:message="errorMessage"
              v-model:detailed-message="detailedErrorMessage"
              color="error"
            />
          </div>
          <v-slide-x-reverse-transition>
            <div
              v-if="helpVisible"
              class="ml-6 help-container"
              :style="helpContainerStyles"
            >
              <g-scroll-container class="help-content">
                <slot name="help-slot" />
              </g-scroll-container>
            </div>
          </v-slide-x-reverse-transition>
        </div>
      </v-card-text>
      <div>
        <v-alert
          v-if="!isCreateMode && isOrphanedBinding"
          :value="true"
          type="info"
          color="primary"
          variant="tonal"
        >
          The Secret <code>{{ credentialName }}</code> for this <code>Binding</code> does not exist anymore and will be re-created if you update the data.
        </v-alert>
        <v-alert
          :model-value="!isCreateMode && credentialUsageCount > 0"
          type="warning"
          rounded="0"
          class="mb-2"
        >
          <div>This <code>Secret</code> is used by {{ credentialUsageCount }} {{ credentialUsageCount === 1 ? 'cluster' : 'clusters' }}. The new <code>Secret</code> should be part of the same account as the one that gets replaced.</div>
          <div>Clusters will only start using the new <code>Secret</code> after they are reconciled. Therefore, wait until all clusters using the <code>Secret</code> are reconciled before you disable the old <code>Secret</code> in your infrastructure account. Otherwise the clusters will no longer function.</div>
        </v-alert>
        <v-alert
          :model-value="!isCreateMode && bindingsWithSameCredential?.length > 0"
          type="info"
          rounded="0"
          class="mb-2"
        >
          <p>
            This <code>Secret</code> is also referenced by
          </p>
          <v-chip
            v-for="{ kind, metadata: { uid, name: bName }} in bindingsWithSameCredential"
            :key="uid"
            v-tooltip:top="kind"
            class="mr-2"
            size="small"
            :prepend-icon="kind === 'SecretBinding' ? 'mdi-key' : 'mdi-key-outline'"
          >
            {{ bName }}
          </v-chip>
          <p class="mt-2">
            Updating <code>Secret</code> data for this <code>{{ resourceKind }}</code> will also affect the other <code>Bindings</code> that reference this <code>Secret</code>.
          </p>
        </v-alert>
      </div>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          variant="text"
          color="primary"
          @click="submit"
        >
          {{ submitButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import {
  mapActions,
  mapState,
  storeToRefs,
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  maxLength,
} from '@vuelidate/validators'
import {
  computed,
  toRefs,
} from 'vue'

import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useShootStore } from '@/store/shoot'
import { useConfigStore } from '@/store/config'

import GToolbar from '@/components/GToolbar.vue'
import GMessage from '@/components/GMessage'
import GScrollContainer from '@/components/GScrollContainer'

import { useSecretContext } from '@/composables/credential/useSecretContext'
import { useSecretBindingContext } from '@/composables/credential/useSecretBindingContext'
import { useCredentialsBindingContext } from '@/composables/credential/useCredentialsBindingContext'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCloudProviderCredential } from '@/composables/credential/useCloudProviderCredential'

import {
  messageFromErrors,
  withFieldName,
  unique,
  lowerCaseAlphaNumHyphen,
  noStartEndHyphen,
} from '@/utils/validators'
import {
  errorDetailsFromError,
  isConflict,
} from '@/utils/error'
import {
  getErrorMessages,
  setDelayedInputFocus,
  setInputFocus,
} from '@/utils'

import kebapCase from 'lodash/kebabCase'

export default {
  components: {
    GMessage,
    GToolbar,
    GScrollContainer,
  },
  inject: ['logger'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secretValidations: {
      // need to pass nested validation object which shares scope,
      // as v$ is part of secretValidations but not vice versa
      type: Object,
      required: true,
    },
    providerType: {
      type: String,
      required: true,
    },
    binding: {
      type: Object,
    },
    credential: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props) {
    const { credential, binding, providerType } = toRefs(props)
    const gardenerExtensionStore = useGardenerExtensionStore()
    const { dnsProviderTypes } = storeToRefs(gardenerExtensionStore)

    const isDnsProvider = computed(() => dnsProviderTypes.value.includes(providerType.value))

    let credentialComposable = {}

    if (binding.value) {
      credentialComposable = useCloudProviderBinding(binding)
    } else if (credential.value) {
      credentialComposable = useCloudProviderCredential(credential)
    }

    const {
      isOrphanedBinding,
      credentialUsageCount,
      credentialName,
      bindingsWithSameCredential,
      resourceName,
      resourceKind,
      credential: credentialResource,
    } = credentialComposable

    let bindingContext = {}
    if (!isDnsProvider.value) {
      const { isSecretBinding } = credentialComposable
      if (isSecretBinding) {
        // Legacy SecretBinding for existing SecrertBindings
        bindingContext = useSecretBindingContext()
      } else {
        bindingContext = useCredentialsBindingContext()
      }
    }

    const {
      createBindingManifest,
      setBindingManifest,
      bindingManifest,
      bindingName,
      bindingProviderType,
      bindingRef,
    } = bindingContext

    const {
      createSecretManifest,
      setSecretManifest,
      secretManifest,
      secretName,
      dnsSecretProviderType,
    } = useSecretContext()

    return {
      createBindingManifest,
      setBindingManifest,
      bindingManifest,
      bindingName,
      bindingProviderType,
      dnsSecretProviderType,
      bindingRef,
      createSecretManifest,
      setSecretManifest,
      secretManifest,
      secretName,
      isOrphanedBinding,
      credentialUsageCount,
      credentialName,
      bindingsWithSameCredential,
      isDnsProvider,
      resourceName,
      resourceKind,
      credentialResource,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      helpVisible: false,
    }
  },
  validations () {
    const rules = {}
    if (!this.isCreateMode) {
      return rules
    }

    const nameRules = {
      required,
      maxLength: maxLength(128),
      lowerCaseAlphaNumHyphen,
      noStartEndHyphen,
      unique: unique('credentialNames'),
    }
    rules.name = withFieldName('Secret Name', nameRules)

    return rules
  },
  computed: {
    ...mapState(useGardenerExtensionStore, ['dnsProviderTypes']),
    ...mapState(useShootStore, ['shootList']),
    ...mapState(useCredentialStore, [
      'infrastructureBindingList',
      'dnsCredentialList',
    ]),
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    credentialNames () {
      return [
        ...this.infrastructureBindingList.map(item => item.metadata.name),
        ...this.dnsCredentialList.map(item => item.metadata.name),
      ]
    },
    isCreateMode () {
      return !this.credential && !this.binding
    },
    submitButtonText () {
      return this.isCreateMode ? 'Add Secret' : 'Update Secret'
    },
    title () {
      return this.isCreateMode
        ? `Add new ${this.displayName} Secret`
        : `Replace ${this.displayName} Secret`
    },
    helpContainerStyles () {
      const detailsRef = this.$refs.secretDetails
      let detailsHeight = 0
      if (detailsRef) {
        detailsHeight = detailsRef.getBoundingClientRect().height
      }
      return {
        maxHeight: `${detailsHeight}px`,
        maxWidth: '50%',
      }
    },
    displayName () {
      return this.vendorDisplayName(this.providerType)
    },
    name: {
      get () {
        if (this.isDnsProvider) {
          return this.secretName
        }
        return this.bindingName
      },
      set (value) {
        if (!this.isDnsProvider) {
          this.bindingName = value
          this.bindingRef.name = value
        }
        this.secretName = value
      },
    },
  },
  mounted () {
    this.reset()
  },
  methods: {
    ...mapActions(useCredentialStore, [
      'createDnsCredential',
      'createInfraCredential',
      'updateDnsCredential',
      'updateInfraCredential',
    ]),
    ...mapActions(useConfigStore, ['vendorDisplayName']),
    hide () {
      this.visible = false
    },
    cancel () {
      this.hide()
    },
    async submit () {
      if (this.secretValidations.$invalid) {
        await this.secretValidations.$validate()
        const message = messageFromErrors(this.secretValidations.$errors)
        this.errorMessage = 'There are input errors that you need to resolve'
        this.detailedErrorMessage = message
        return
      }
      try {
        await this.save()
        this.hide()
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        const secretType = this.isDnsProvider ? 'DNS Credential' : 'Infrastructure Secret'
        if (this.isCreateMode) {
          if (isConflict(err)) {
            this.errorMessage = `${secretType} name '${this.name}' is already taken. Please try a different name.`
            setInputFocus(this, 'name')
          } else {
            this.errorMessage = `Failed to create ${secretType}.`
          }
        } else {
          this.errorMessage = `Failed to update ${secretType}.`
        }
        this.detailedErrorMessage = errorDetails.detailedMessage
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    save () {
      if (this.isCreateMode) {
        return this.isDnsProvider
          ? this.createDnsCredential({ secret: this.secretManifest })
          : this.createInfraCredential({ secret: this.secretManifest, binding: this.bindingManifest })
      } else {
        return this.isDnsProvider
          ? this.updateDnsCredential({ secret: this.secretManifest })
          : this.updateInfraCredential({ secret: this.secretManifest, binding: this.bindingManifest })
      }
    },
    reset () {
      this.v$.$reset()

      if (this.isCreateMode) {
        this.createSecretManifest()

        if (this.isDnsProvider) {
          this.dnsSecretProviderType = this.providerType
        } else {
          this.createBindingManifest()
          this.bindingProviderType = this.providerType
        }

        const kebapName = kebapCase(this.displayName)
        this.name = `my-${kebapName}-secret`

        setDelayedInputFocus(this, 'name')
      } else {
        if (this.binding) {
          this.setBindingManifest(this.binding)
        }
        this.setSecretManifest(this.credentialResource)

        if (this.isDnsProvider) {
          // Always set providertype, this ensures label is also set when updating old secrets without dashboard specific label
          this.dnsSecretProviderType = this.providerType
        }
      }

      this.errorMessage = undefined
      this.detailedMessage = undefined
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>

.help-container {
  position: relative;
  overflow: hidden;
}

.help-content {
  height: 100%;
  padding-right: 15px;
  box-sizing: content-box;
}

</style>
