<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="850">
    <v-card>
      <v-card-title class="toolbar-background">
        <span class="text-h5 toolbar-title--text">{{title}}</span>
        <v-spacer></v-spacer>
        <v-btn
          light
          icon
          :class="helpVisible ? 'toolbar-title toolbar--text' : 'toolbar toolbar-title--text'"
          @click="helpVisible=!helpVisible"
        >
          <v-icon>mdi-help</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div class="d-flex flex-row pa-3">
          <div class="d-flex flex-column flex-grow-1" ref="secretDetails">
            <div>
              <template v-if="isCreateMode">
                <v-text-field
                  color="primary"
                  ref="name"
                  v-model.trim="name"
                  label="Secret Name"
                  :error-messages="getErrorMessages('name')"
                  @update:model-value="$v.name.$touch()"
                  @blur="$v.name.$touch()"
                ></v-text-field>
              </template>
              <template v-else>
                <div class="text-h6 pb-4">{{name}}</div>
              </template>
              </div>

            <div v-show="cloudProfiles.length !== 1 && isInfrastructureSecret">
              <cloud-profile
                ref="cloudProfile"
                v-model="cloudProfileName"
                :create-mode="isCreateMode"
                :cloud-profiles="cloudProfiles">
              </cloud-profile>
            </div>

            <slot name="secret-slot"></slot>
            <g-message color="error" v-model:message="errorMessage" v-model:detailed-message="detailedErrorMessage"></g-message>
          </div>
          <v-slide-x-reverse-transition>
            <div v-if="helpVisible" class="pa-3 ml-3 help" :style="helpStyle">
              <slot name="help-slot"></slot>
            </div>
          </v-slide-x-reverse-transition>
       </div>
      </v-card-text>
      <v-alert :value="!isCreateMode && relatedShootCount > 0" type="warning" rounded="0">
        This secret is used by {{relatedShootCount}} clusters. The new secret should be part of the same account as the one that gets replaced.
      </v-alert>
       <v-alert :value="!isCreateMode && relatedShootCount > 0" type="warning" rounded="0">
        Clusters will only start using the new secret after they got reconciled. Therefore, wait until all clusters using the secret are reconciled before you disable the old secret in your infrastructure account. Otherwise the clusters will no longer function.
      </v-alert>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="cancel">Cancel</v-btn>
        <v-btn variant="text" @click="submit" color="primary" :disabled="!valid">{{submitButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import { required, maxLength } from 'vuelidate/lib/validators'
import { unique, resourceName } from '@/utils/validators'
import { getValidationErrors, setDelayedInputFocus, setInputFocus } from '@/utils'
import CloudProfile from '@/components/CloudProfile.vue'
import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import map from 'lodash/map'
import head from 'lodash/head'
import sortBy from 'lodash/sortBy'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import GMessage from '@/components/GMessage.vue'
import { errorDetailsFromError, isConflict } from '@/utils/error'

const validationErrors = {
  name: {
    required: 'You can\'t leave this empty.',
    maxLength: 'It exceeds the maximum length of 128 characters.',
    resourceName: 'Please use only lowercase alphanumeric characters and hyphen',
    unique: 'Name is taken. Try another.'
  }
}

export default {
  name: 'secret-dialog',
  components: {
    CloudProfile,
    GMessage
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    data: {
      type: Object,
      required: true
    },
    dataValid: {
      type: Boolean,
      required: true
    },
    vendor: {
      type: String,
      required: true
    },
    createTitle: {
      type: String,
      required: true
    },
    replaceTitle: {
      type: String,
      required: true
    },
    secret: {
      type: Object
    }
  },
  data () {
    return {
      selectedCloudProfile: undefined,
      name: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      validationErrors,
      helpVisible: false
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'infrastructureSecretList',
      'cloudProfilesByCloudProviderKind',
      'shootList',
      'sortedCloudProviderKindList'
    ]),
    ...mapGetters('gardenerExtensions', [
      'sortedDnsProviderList'
    ]),
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
      }
    },
    cloudProfiles () {
      return sortBy(this.cloudProfilesByCloudProviderKind(this.vendor), [(item) => item.metadata.name])
    },
    visible: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    valid () {
      let isCloudProfileValid = true
      if (this.isCreateMode && this.isInfrastructureSecret) {
        isCloudProfileValid = this.isValid(this.$refs.cloudProfile)
      }
      return isCloudProfileValid && this.dataValid && this.isValid(this)
    },
    validators () {
      const validators = {}
      if (this.isCreateMode) {
        validators.name = {
          required,
          maxLength: maxLength(128),
          resourceName,
          unique: unique('infrastructureSecretNames')
        }
      }
      return validators
    },
    infrastructureSecretNames () {
      return this.infrastructureSecretList.map(item => item.metadata.name)
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
        maxHeight: `${detailsHeight}px`
      }
    },
    isInfrastructureSecret () {
      return includes(this.sortedCloudProviderKindList, this.vendor)
    },
    isDnsProviderSecret () {
      return includes(this.dnsProviderTypes, this.vendor)
    }
  },
  methods: {
    ...mapActions([
      'createCloudProviderSecret',
      'updateCloudProviderSecret'
    ]),
    isValid (component) {
      let isValid = true
      if (component) {
        isValid = !component.$v.$invalid
      }
      return isValid
    },
    hide () {
      this.visible = false
    },
    cancel () {
      this.hide()
    },
    async submit () {
      this.$v.$touch()
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
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
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
            namespace: this.namespace
          }
        }

        if (this.isInfrastructureSecret) {
          metadata.cloudProviderKind = this.vendor
          metadata.cloudProfileName = this.cloudProfileName
        }

        if (this.isDnsProviderSecret) {
          metadata.dnsProviderName = this.vendor
        }

        return this.createCloudProviderSecret({ metadata, data: this.data })
      } else {
        const metadata = cloneDeep(this.secret.metadata)

        return this.updateCloudProviderSecret({ metadata, data: this.data })
      }
    },
    reset () {
      this.$v.$reset()
      const cloudProfileRef = this.$refs.cloudProfile
      if (cloudProfileRef) {
        cloudProfileRef.$v.$reset()
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
    }
  },
  mounted () {
    this.reset()
  }
}
</script>

<style lang="scss" scoped>

  .help {
    max-width: 80%;
    overflow-y: auto;
  }

</style>
