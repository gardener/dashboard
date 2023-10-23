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
                  :error-messages="getErrorMessages('name')"
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

            <div v-if="cloudProfiles.length !== 1 && isInfrastructureSecret">
              <g-cloud-profile
                ref="cloudProfile"
                v-model="cloudProfileName"
                :create-mode="isCreateMode"
                :cloud-profiles="cloudProfiles"
              />
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
              class="pa-3 ml-3 help"
              :style="helpStyle"
            >
              <slot name="help-slot" />
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
          :disabled="!valid"
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
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useShootStore } from '@/store/shoot'
import { useConfigStore } from '@/store/config'

import GToolbar from '@/components/GToolbar.vue'
import GMessage from '@/components/GMessage'
import GCloudProfile from '@/components/GCloudProfile'

import {
  errorDetailsFromError,
  isConflict,
} from '@/utils/error'
import {
  getValidationErrors,
  setDelayedInputFocus,
  setInputFocus,
} from '@/utils'
import {
  unique,
  resourceName,
} from '@/utils/validators'

import {
  cloneDeep,
  get,
  map,
  head,
  sortBy,
  filter,
  includes,
} from '@/lodash'

const validationErrors = {
  name: {
    required: 'You can\'t leave this empty.',
    maxLength: 'It exceeds the maximum length of 128 characters.',
    resourceName: 'Please use only lowercase alphanumeric characters and hyphen',
    unique: 'Name is taken. Try another.',
  },
}

export default {
  components: {
    GCloudProfile,
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
    dataValid: {
      type: Boolean,
      required: true,
    },
    vendor: {
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
      selectedCloudProfile: undefined,
      name: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      validationErrors,
      helpVisible: false,
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    ...mapState(useAuthzStore, ['namespace']),
    ...mapState(useSecretStore, [
      'infrastructureSecretList',
      'dnsSecretList',
    ]),
    ...mapState(useCloudProfileStore, ['sortedInfrastructureKindList']),
    ...mapState(useGardenerExtensionStore, ['sortedDnsProviderList']),
    ...mapState(useShootStore, ['shootList']),
    dnsProviderTypes () {
      return map(this.sortedDnsProviderList, 'type')
    },
    cloudProfileName: {
      get () {
        return this.selectedCloudProfile
      },
      set (cloudProfileName) {
        this.selectedCloudProfile = cloudProfileName
        this.$emit('cloud-profile-name', cloudProfileName)
      },
    },
    cloudProfiles () {
      return sortBy(this.cloudProfilesByCloudProviderKind(this.vendor), [(item) => item.metadata.name])
    },
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    valid () {
      return this.dataValid && !this.v$.$invalid
    },
    validators () {
      const validators = {}
      if (this.isCreateMode) {
        validators.name = {
          required,
          maxLength: maxLength(128),
          resourceName,
          unique: unique(this.isDnsProviderSecret ? 'dnsSecretNames' : 'infrastructureSecretNames'),
        }
      }
      return validators
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
      return this.isCreateMode
        ? `Add new ${this.vendorDisplayName(this.vendor)} Secret`
        : `Replace ${this.vendorDisplayName(this.vendor)} Secret`
    },
    relatedShootCount () {
      return this.shootsByInfrastructureSecret.length
    },
    shootsByInfrastructureSecret () {
      const name = get(this.secret, 'metadata.name')
      return filter(this.shootList, ['spec.secretBindingName', name])
    },
    helpStyle () {
      const detailsRef = this.$refs.secretDetails
      let detailsHeight = 0
      if (detailsRef) {
        detailsHeight = detailsRef.getBoundingClientRect().height
      }
      return {
        maxHeight: `${detailsHeight}px`,
      }
    },
    isInfrastructureSecret () {
      return includes(this.sortedInfrastructureKindList, this.vendor)
    },
    isDnsProviderSecret () {
      return includes(this.dnsProviderTypes, this.vendor)
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
    ...mapActions(useCloudProfileStore, [
      'cloudProfilesByCloudProviderKind',
    ]),
    ...mapActions(useConfigStore, ['vendorDisplayName']),
    hide () {
      this.visible = false
    },
    cancel () {
      this.hide()
    },
    async submit () {
      this.v$.$touch()
      if (this.valid) {
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
        }

        if (this.isInfrastructureSecret) {
          metadata.cloudProviderKind = this.vendor
          metadata.cloudProfileName = this.cloudProfileName
        }

        if (this.isDnsProviderSecret) {
          metadata.dnsProviderName = this.vendor
        }

        return this.createSecret({ metadata, data: this.data })
      } else {
        const metadata = cloneDeep(this.secret.metadata)

        return this.updateSecret({ metadata, data: this.data })
      }
    },
    reset () {
      this.v$.$reset()
      const cloudProfileRef = this.$refs.cloudProfile
      if (cloudProfileRef) {
        cloudProfileRef.v$.$reset()
      }

      if (this.isCreateMode) {
        this.name = `my-${this.vendor}-secret`

        if (this.cloudProfiles.length === 1) {
          this.cloudProfileName = get(head(this.cloudProfiles), 'metadata.name')
        } else {
          this.cloudProfileName = undefined
        }

        setDelayedInputFocus(this, 'name')
      } else {
        this.name = get(this.secret, 'metadata.name')
        this.cloudProfileName = get(this.secret, 'metadata.cloudProfileName')
      }

      this.errorMessage = undefined
      this.detailedMessage = undefined
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
  },
}
</script>

<style lang="scss" scoped>

  .help {
    max-width: 80%;
    overflow-y: auto;
  }

</style>
