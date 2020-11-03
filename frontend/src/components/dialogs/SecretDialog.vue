<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="750">
    <v-card>
      <v-img
        class="white--text align-center justify-start"
        height="130px"
        :src="backgroundSrc"
      >
        <v-card-title>
          <infra-icon v-model="infraIcon" :width="42"></infra-icon>
          <span class="headline ml-5">{{title}}</span>
        </v-card-title>
      </v-img>
      <v-card-text>
        <v-container fluid>
          <div>
            <template v-if="isCreateMode">
              <v-text-field
                :color="color"
                ref="secretName"
                v-model.trim="secretName"
                label="Secret Name"
                :error-messages="getErrorMessages('secretName')"
                @input="$v.secretName.$touch()"
                @blur="$v.secretName.$touch()"
              ></v-text-field>
            </template>
            <template v-else>
              <div class="title pb-4">{{secretName}}</div>
            </template>
            </div>

          <div v-show="cloudProfiles.length !== 1">
            <cloud-profile
              ref="cloudProfile"
              v-model="cloudProfileName"
              :isCreateMode="isCreateMode"
              :cloudProfiles="cloudProfiles"
              :color="color">
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
        <v-btn text @click.native="submit" :class="textColor" :disabled="!valid">{{submitButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import { required, maxLength } from 'vuelidate/lib/validators'
import { unique, resourceName } from '@/utils/validators'
import { getValidationErrors, setDelayedInputFocus, setInputFocus, textColor } from '@/utils'
import CloudProfile from '@/components/CloudProfile'
import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import head from 'lodash/head'
import sortBy from 'lodash/sortBy'
import filter from 'lodash/filter'
import GAlert from '@/components/GAlert'
import InfraIcon from '@/components/VendorIcon'
import { errorDetailsFromError, isConflict } from '@/utils/error'

const validationErrors = {
  secretName: {
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
    InfraIcon
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
    backgroundSrc: {
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
    color: {
      type: String,
      required: true
    },
    infraIcon: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      selectedCloudProfile: undefined,
      secretName: undefined,
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
    bindingName () {
      if (this.isCreateMode) {
        return this.secretName
      } else {
        return get(this.secret, 'metadata.bindingName')
      }
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
        validators.secretName = {
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
    textColor () {
      return textColor(this.color)
    },
    relatedShootCount () {
      return this.shootsByInfrastructureSecret.length
    },
    shootsByInfrastructureSecret () {
      const secretName = get(this.secret, 'metadata.name')
      if (secretName) {
        const predicate = item => {
          return get(item, 'spec.secretBindingName') === secretName
        }
        return filter(this.shootList, predicate)
      }
      return []
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
              this.errorMessage = `Infrastructure Secret name '${this.secretName}' is already taken. Please try a different name.`
              setInputFocus(this, 'secretName')
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
          name: this.secretName,
          namespace: this.namespace,
          cloudProviderKind: this.cloudProviderKind,
          cloudProfileName: this.cloudProfileName,
          bindingName: this.bindingName
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
        this.secretName = `my-${this.cloudProviderKind}-secret`

        if (this.cloudProfiles.length === 1) {
          this.cloudProfileName = get(head(this.cloudProfiles), 'metadata.name')
        } else {
          this.cloudProfileName = undefined
        }

        setDelayedInputFocus(this, 'secretName')
      } else {
        this.secretName = get(this.secret, 'metadata.name')
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
