<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="750">
    <v-card>
      <card-svg-title>
        <template v-slot:svgComponent>
            <secret-background></secret-background>
        </template>
        <infra-icon v-model="infraIcon" iconColor="accentTitle" :size="42"></infra-icon>
        <span class="headline ml-5 accentTitle--text">{{title}}</span>
      </card-svg-title>
      <v-card-text>
        <v-container fluid>
          <div>
            <template v-if="isCreateMode">
              <v-text-field
                color="primary"
                ref="name"
                v-model.trim="name"
                label="Secret Name"
                :error-messages="getErrorMessages('name')"
                @input="$v.name.$touch()"
                @blur="$v.name.$touch()"
              ></v-text-field>
            </template>
            <template v-else>
              <div class="title pb-4">{{name}}</div>
            </template>
            </div>

          <div v-show="cloudProfiles.length !== 1">
            <cloud-profile
              ref="cloudProfile"
              v-model="cloudProfileName"
              :isCreateMode="isCreateMode"
              :cloudProfiles="cloudProfiles">
            </cloud-profile>
          </div>

          <slot name="data-slot"></slot>
          <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
        </v-container>
      </v-card-text>
      <v-alert :value="!isCreateMode && relatedShootCount > 0" type="warning">
        This secret is used by {{relatedShootCount}} clusters. The new secret should be part of the same account as the one that gets replaced.
      </v-alert>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click.native="cancel">Cancel</v-btn>
        <v-btn text @click.native="submit" color="primary" :disabled="!valid">{{submitButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import { required, maxLength } from 'vuelidate/lib/validators'
import { unique, resourceName } from '@/utils/validators'
import { getValidationErrors, setDelayedInputFocus, setInputFocus } from '@/utils'
import CloudProfile from '@/components/CloudProfile'
import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import head from 'lodash/head'
import sortBy from 'lodash/sortBy'
import filter from 'lodash/filter'
import GAlert from '@/components/GAlert'
import InfraIcon from '@/components/InfraIcon'
import { errorDetailsFromError, isConflict } from '@/utils/error'
import SecretBackground from '@/components/backgrounds/SecretBackground.vue'
import CardSvgTitle from '@/components/CardSvgTitle.vue'

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
    GAlert,
    InfraIcon,
    SecretBackground,
    CardSvgTitle
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
    cloudProviderKind: {
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
    },
    infraIcon: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      selectedCloudProfile: undefined,
      name: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      validationErrors
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
      'shootList'
    ]),
    cloudProfileName: {
      get () {
        return this.selectedCloudProfile
      },
      set (cloudProfileName) {
        this.selectedCloudProfile = cloudProfileName
        this.$emit('cloudProfileName', cloudProfileName)
      }
    },
    cloudProfiles () {
      return sortBy(this.cloudProfilesByCloudProviderKind(this.cloudProviderKind), [(item) => item.metadata.name])
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
      if (this.isCreateMode) {
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
    }
  },
  methods: {
    ...mapActions([
      'createInfrastructureSecret',
      'updateInfrastructureSecret'
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
      if (get(this.$route.params, 'name')) {
        this.$router.replace({ name: 'Secrets', params: { namespace: this.namespace } })
      }
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
          },
          cloudProviderKind: this.cloudProviderKind,
          cloudProfileName: this.cloudProfileName
        }

        return this.createInfrastructureSecret({ metadata, data: this.data })
      } else {
        const metadata = cloneDeep(this.secret.metadata)

        return this.updateInfrastructureSecret({ metadata, data: this.data })
      }
    },
    reset () {
      this.$v.$reset()
      const cloudProfileRef = this.$refs.cloudProfile
      if (cloudProfileRef) {
        cloudProfileRef.$v.$reset()
      }

      this.accessKeyId = ''
      this.secretAccessKey = ''

      if (this.isCreateMode) {
        this.name = `my-${this.cloudProviderKind}-secret`

        if (this.cloudProfiles.length === 1) {
          this.cloudProfileName = get(head(this.cloudProfiles), 'metadata.name')
        } else {
          this.cloudProfileName = undefined
        }

        setDelayedInputFocus(this, 'name')
      } else {
        this.name = get(this.secret, 'metadata.name')
        this.cloudProfileName = get(this.secret, 'metadata.cloudProfileName')
        setDelayedInputFocus(this, 'accessKeyId')
      }

      this.errorMessage = undefined
      this.detailedMessage = undefined
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    }
  }
}
</script>
