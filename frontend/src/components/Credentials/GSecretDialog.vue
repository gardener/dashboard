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
                  {{ name }} ({{ binding.kind }})
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
              <div class="help-content">
                <slot name="help-slot" />
              </div>
            </div>
          </v-slide-x-reverse-transition>
        </div>
      </v-card-text>
      <div>
        <v-alert
          :model-value="!isCreateMode && relatedShootCount > 0"
          type="warning"
          rounded="0"
          class="mb-2"
        >
          <div>This secret is used by {{ relatedShootCount }} clusters. The new secret should be part of the same account as the one that gets replaced.</div>
          <div>Clusters will only start using the new secret after they got reconciled. Therefore, wait until all clusters using the secret are reconciled before you disable the old secret in your infrastructure account. Otherwise the clusters will no longer function.</div>
        </v-alert>
        <v-alert
          :model-value="otherBindings.length > 0"
          type="info"
          rounded="0"
          class="mb-2"
        >
          This secret is also referenced by
          <pre
            v-for="referencedBinding in otherBindings"
            :key="referencedBinding.metadata.uid"
          >{{ referencedBinding.metadata.name }} ({{ (referencedBinding.kind) }})</pre>
          Updating secret data for this {{ binding.kind }} will also affect the other binfings that reference this secret.
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
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  maxLength,
} from '@vuelidate/validators'

import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useShootStore } from '@/store/shoot'

import GToolbar from '@/components/GToolbar.vue'
import GMessage from '@/components/GMessage'

import { useSecretContext } from '@/composables/credential/useSecretContext'
import { useSecretBindingContext } from '@/composables/credential/useSecretBindingContext'
import { useCredentialsBindingContext } from '@/composables/credential/useCredentialsBindingContext'

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
  calcRelatedShootCount,
} from '@/utils'

import includes from 'lodash/includes'

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
    createTitle: {
      type: String,
      required: true,
    },
    replaceTitle: {
      type: String,
      required: true,
    },
    binding: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
    'cloud-profile-name',
  ],
  setup (props) {
    let bindingContext
    if (!props.binding) {
      // New binding always created as type 'CredentialsBinding'
      bindingContext = useCredentialsBindingContext()
    } else if (props.binding._isSecretBinding) {
      bindingContext = useSecretBindingContext()
    } else if (props.binding._isCredentialsBinding) {
      bindingContext = useCredentialsBindingContext()
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
    } = useSecretContext()

    return {
      createBindingManifest,
      setBindingManifest,
      bindingManifest,
      bindingName,
      bindingProviderType,
      bindingRef,
      createSecretManifest,
      setSecretManifest,
      secretManifest,
      secretName,
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
      unique: unique(this.isDnsProviderSecret ? 'dnsSecretNames' : 'infrastructureSecretNames'),
    }
    rules.name = withFieldName('Secret Name', nameRules)

    return rules
  },
  computed: {
    ...mapState(useCredentialStore, [
      'infrastructureBindingList',
      'dnsBindingList',
    ]),
    ...mapState(useGardenerExtensionStore, ['dnsProviderTypes']),
    ...mapState(useShootStore, ['shootList']),
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    infrastructureSecretNames () {
      return this.infrastructureBindingList.map(item => item.metadata.name)
    },
    dnsSecretNames () {
      return this.dnsBindingList.map(item => item.metadata.name)
    },
    isCreateMode () {
      return !this.binding
    },
    submitButtonText () {
      return this.isCreateMode ? 'Add Secret' : 'Replace Secret'
    },
    title () {
      return this.isCreateMode ? this.createTitle : this.replaceTitle
    },
    relatedShootCount () {
      return calcRelatedShootCount(this.shootList, this.binding)
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
    isInfrastructureSecret () {
      return includes(this.sortedProviderTypeList, this.providerType)
    },
    isDnsProviderSecret () {
      return includes(this.dnsProviderTypes, this.providerType)
    },
    name: {
      get () {
        return this.bindingName
      },
      set (value) {
        this.bindingName = value
        this.secretName = value
        this.bindingRef.name = value
      },
    },
    otherBindings () {
      return this.bindingsForSecret(this.binding._secret?.metadata.uid).filter(({ metadata }) => metadata.uid !== this.binding.metadata.uid)
    },
  },
  mounted () {
    this.reset()
  },
  methods: {
    ...mapActions(useCredentialStore, [
      'createCredential',
      'updateCredential',
      'bindingsForSecret',
    ]),
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
        if (this.isCreateMode) {
          if (isConflict(err)) {
            this.errorMessage = `Infrastructure Secret name '${this.name}' is already taken. Please try a different name.`
            setInputFocus(this, 'name')
          } else {
            this.errorMessage = 'Failed to create Infrastructure Secret.'
          }
        } else {
          this.errorMessage = 'Failed to update Infrastructure Secret.'
        }
        this.detailedErrorMessage = errorDetails.detailedMessage
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    save () {
      if (this.isCreateMode) {
        return this.createCredential({ secret: this.secretManifest, binding: this.bindingManifest })
      } else {
        return this.updateCredential({ secret: this.secretManifest, binding: this.bindingManifest })
      }
    },
    reset () {
      this.v$.$reset()

      if (this.isCreateMode) {
        this.createBindingManifest()
        this.createSecretManifest()
        this.name = `my-${this.providerType}-secret`
        this.bindingProviderType = this.providerType

        setDelayedInputFocus(this, 'name')
      } else {
        this.setBindingManifest(this.binding)
        this.setSecretManifest(this.binding._secret)
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
  overflow-y: auto;
  padding-right: 15px;
  box-sizing: content-box;
}

.help-container::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(var(--v-theme-surface)));
  pointer-events: none;
}

</style>
