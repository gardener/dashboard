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
                  {{ name }}
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
          :model-value="!isCreateMode && relatedShootCount > 0"
          type="warning"
          rounded="0"
          class="mb-2"
        >
          This secret is used by {{ relatedShootCount }} clusters. The new secret should be part of the same account as the one that gets replaced.
        </v-alert>
        <v-alert
          :model-value="!isCreateMode && relatedShootCount > 0"
          type="warning"
          rounded="0"
          class="mb-2"
        >
          Clusters will only start using the new secret after they got reconciled. Therefore, wait until all clusters using the secret are reconciled before you disable the old secret in your infrastructure account. Otherwise the clusters will no longer function.
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
import GScrollContainer from '@/components/GScrollContainer'

import { useCredentialContext } from '@/composables/useCredentialContext'

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

import includes from 'lodash/includes'
import filter from 'lodash/filter'
import get from 'lodash/get'

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
    createTitle: {
      type: String,
      required: true,
    },
    replaceTitle: {
      type: String,
      required: true,
    },
    secretBinding: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
    'cloud-profile-name',
  ],
  setup () {
    const { createSecretBindingManifest,
      setSecretBindingManifest,
      secretBindingManifest,
      secretBindingName,
      secretBindingProviderType,
      secretBindingSecretRef,
      createSecretManifest,
      setSecretManifest,
      secretManifest,
      secretName } = useCredentialContext()

    return {
      createSecretBindingManifest,
      setSecretBindingManifest,
      secretBindingManifest,
      secretBindingName,
      secretBindingProviderType,
      secretBindingSecretRef,
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
      'infrastructureSecretBindingsList',
      'dnsSecretBindingsList',
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
      return this.infrastructureSecretBindingsList.map(item => item.metadata.name)
    },
    dnsSecretNames () {
      return this.dnsSecretBindingsList.map(item => item.metadata.name)
    },
    isCreateMode () {
      return !this.secretBinding
    },
    submitButtonText () {
      return this.isCreateMode ? 'Add Secret' : 'Replace Secret'
    },
    title () {
      return this.isCreateMode ? this.createTitle : this.replaceTitle
    },
    relatedShootCount () {
      return this.shootsByInfrastructureSecret.length
    },
    shootsByInfrastructureSecret () {
      const name = get(this.secretBinding, ['metadata', 'name'])
      return filter(this.shootList, ['spec.secretBindingName', name])
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
        return this.secretBindingName
      },
      set (value) {
        this.secretBindingName = value
        this.secretName = value
        this.secretBindingSecretRef.name = value
      },
    },
  },
  mounted () {
    this.reset()
  },
  methods: {
    ...mapActions(useCredentialStore, [
      'createCredential',
      'updateCredential',
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
        return this.createCredential({ secret: this.secretManifest, secretBinding: this.secretBindingManifest })
      } else {
        return this.updateCredential({ secret: this.secretManifest, secretBinding: this.secretBindingManifest })
      }
    },
    reset () {
      this.v$.$reset()

      if (this.isCreateMode) {
        this.createSecretBindingManifest()
        this.createSecretManifest()
        this.name = `my-${this.providerType}-secret`
        this.secretBindingProviderType = this.providerType

        setDelayedInputFocus(this, 'name')
      } else {
        this.setSecretBindingManifest(this.secretBinding)
        this.setSecretManifest(this.secretBinding._secret)
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
