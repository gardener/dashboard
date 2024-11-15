<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog
    v-model="visible"
    max-width="850"
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
              <div class="help-content">
                <slot name="help-slot" />
              </div>
            </div>
          </v-slide-x-reverse-transition>
        </div>
      </v-card-text>
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

import { useSecretStore } from '@/store/secret'
import { useAuthzStore } from '@/store/authz'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useShootStore } from '@/store/shoot'

import GToolbar from '@/components/GToolbar.vue'
import GMessage from '@/components/GMessage'

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
import cloneDeep from 'lodash/cloneDeep'

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
    data: {
      type: Object,
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
    secret: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
    'cloud-profile-name',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      name: undefined,
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
    ...mapState(useAuthzStore, ['namespace']),
    ...mapState(useSecretStore, [
      'infrastructureSecretList',
      'dnsSecretList',
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
      return this.infrastructureSecretList.map(item => item.metadata.name)
    },
    dnsSecretNames () {
      return this.dnsSecretList.map(item => item.metadata.name)
    },
    isCreateMode () {
      return !this.secret
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
      const name = get(this.secret, ['metadata', 'name'])
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
  },
  mounted () {
    this.reset()
  },
  methods: {
    ...mapActions(useSecretStore, [
      'createSecret',
      'updateSecret',
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
        const metadata = {
          name: this.name,
          namespace: this.namespace,
          secretRef: {
            name: this.name,
            namespace: this.namespace,
          },
          provider: {
            type: this.providerType,
          },
        }
        return this.createSecret({ metadata, data: this.data })
      } else {
        const metadata = cloneDeep(this.secret.metadata)

        return this.updateSecret({ metadata, data: this.data })
      }
    },
    reset () {
      this.v$.$reset()

      if (this.isCreateMode) {
        this.name = `my-${this.providerType}-secret`
        setDelayedInputFocus(this, 'name')
      } else {
        this.name = get(this.secret, ['metadata', 'name'])
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
