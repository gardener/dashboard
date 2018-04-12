<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <v-dialog v-model="visible" max-width="800">
    <v-card>
      <v-card-media
        class="white--text"
        height="130px"
        :src="backgroundSrc"
      >
        <v-container>
          <v-layout>
            <v-flex xs2>
              <v-icon x-large class="white--text infra_icon">{{infraIcon}}</v-icon>
            </v-flex>
            <v-flex>
              <div class="credential_title">{{title}}</div>
            </v-flex>
          </v-layout>
        </v-container>
      </v-card-media>

      <v-card-text>
        <form>
          <v-container fluid>
            <v-layout row>
              <v-flex xs5>
                <template v-if="isCreateMode">
                  <v-text-field
                    :color="color"
                    ref="secretName"
                    v-model="secretName"
                    label="Secret Name"
                    :error-messages="getErrorMessages('secretName')"
                    @input="$v.secretName.$touch()"
                    @blur="$v.secretName.$touch()"
                  ></v-text-field>
                </template>
                <template v-else>
                  <div class="title pb-3">{{secretName}}</div>
                </template>
              </v-flex>
            </v-layout>

            <v-layout row v-show="cloudProfiles.length !== 1">
              <v-flex xs5>
                <cloud-profile
                  ref="cloudProfile"
                  v-model="cloudProfileName"
                  :isCreateMode="isCreateMode"
                  :cloudProfiles="cloudProfiles"
                  :color="color">
                </cloud-profile>
              </v-flex>
            </v-layout>

            <slot name="data-slot"></slot>
            </v-layout>
          </v-container>
        </form>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native="cancel">Cancel</v-btn>
        <v-btn flat @click.native="submit" :class="`${color}--text`" :disabled="!valid">{{submitButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
  import { mapActions, mapState, mapGetters } from 'vuex'
  import { required, maxLength } from 'vuelidate/lib/validators'
  import { unique, resourceName } from '@/utils/validators'
  import { getValidationErrors, setDelayedInputFocus } from '@/utils'
  import CloudProfile from '@/components/CloudProfile'
  import cloneDeep from 'lodash/cloneDeep'
  import get from 'lodash/get'
  import head from 'lodash/head'
  import sortBy from 'lodash/sortBy'

  const validationErrors = {
    secretName: {
      required: 'You can\'t leave this empty.',
      maxLength: 'It exceeds the maximum length of 128 characters.',
      resourceName: 'Please use only lowercase alphanumeric characters and hyphen',
      unique: 'Name is taken. Try another.'
    }
  }

  export default {
    components: {
      CloudProfile
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
        'cloudProfilesByCloudProviderKind'
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
      },
      cancel () {
        this.hide()
      },
      submit () {
        this.$v.$touch()
        if (this.valid) {
          this.save()
            .then(secret => {
              this.hide()
            })
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

          return this.createInfrastructureSecret({metadata, data: this.data})
        } else {
          const metadata = cloneDeep(this.secret.metadata)

          return this.updateInfrastructureSecret({metadata, data: this.data})
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


<style lang="styl" scoped>

  .infra_icon {
    font-size:90px
  }

  .credential_title {
    font-size:30px
    padding-top:40px
    font-weight:400
  }

</style>
