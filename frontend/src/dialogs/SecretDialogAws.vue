<!--
Copyright 2018 by The Gardener Authors.

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
    <v-card class="aws_credential">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-amazon</v-icon><span>{{title}}</span>
      </v-card-title>

      <v-card-text>
        <form>
          <v-container fluid>
            <v-layout row>
              <v-flex xs5>
                <template v-if="isCreateMode">
                  <v-text-field
                    color="orange"
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

            <v-layout row>
              <v-flex xs8>
                <v-text-field
                  color="orange"
                  ref="accessKeyId"
                  v-model="accessKeyId"
                  :label="accessKeyIdLabel"
                  :error-messages="getErrorMessages('accessKeyId')"
                  @input="$v.accessKeyId.$touch()"
                  @blur="$v.accessKeyId.$touch()"
                  counter="20"
                  hint="e.g. AKIAIOSFODNN7EXAMPLE"
                ></v-text-field>
              </v-flex>
            </v-layout>

            <v-layout row>
              <v-flex xs8>
                <v-text-field
                  color="orange"
                  v-model="secretAccessKey"
                  :label="secretAccessKeyLabel"
                  :error-messages="getErrorMessages('secretAccessKey')"
                  :append-icon="hideSecret ? 'visibility' : 'visibility_off'"
                  :append-icon-cb="() => (hideSecret = !hideSecret)"
                  :type="hideSecret ? 'password' : 'text'"
                  @input="$v.secretAccessKey.$touch()"
                  @blur="$v.secretAccessKey.$touch()"
                  counter="40"
                  hint="e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY"
                ></v-text-field>
              </v-flex>
            </v-layout>
          </v-container>
        </form>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native="cancel">Cancel</v-btn>
        <v-btn flat @click.native="submit" class="orange--text" :disabled="!valid">{{submitButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
  import { mapActions, mapState, mapGetters } from 'vuex'
  import { required, minLength, maxLength } from 'vuelidate/lib/validators'
  import { unique, resourceName, alphaNumUnderscore, base64 } from '@/utils/validators'
  import { getValidationErrors, setInputFocus } from '@/utils'
  import cloneDeep from 'lodash/cloneDeep'

  const validationErrors = {
    secretName: {
      required: 'You can\'t leave this empty.',
      maxLength: 'It exceeds the maximum length of 128 characters.',
      resourceName: 'Please use only lowercase alphanumeric characters and hyphen',
      unique: 'Name is taken. Try another.'
    },
    accessKeyId: {
      required: 'You can\'t leave this empty.',
      minLength: 'It must contain at least 16 characters.',
      maxLength: 'It exceeds the maximum length of 128 characters.',
      alphaNumUnderscore: 'Please use only alphanumeric characters and underscore.'
    },
    secretAccessKey: {
      required: 'You can\'t leave this empty.',
      minLength: 'It must contain at least 40 characters.',
      base64: 'Please enter a valid base64 string.'
    }
  }

  export default {
    props: {
      value: {
        type: Boolean,
        required: true
      },
      secret: {
        type: Object
      }
    },
    data () {
      return {
        secretName: undefined,
        accessKeyId: undefined,
        secretAccessKey: undefined,
        hideSecret: true,
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
        'infrastructureSecretList'
      ]),
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      },
      valid () {
        return !this.$v.$invalid
      },
      validators () {
        const validators = {
          accessKeyId: {
            required,
            minLength: minLength(16),
            maxLength: maxLength(128),
            alphaNumUnderscore
          },
          secretAccessKey: {
            required,
            minLength: minLength(40),
            base64
          }
        }
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
      accessKeyIdLabel () {
        return this.isCreateMode ? 'Access Key Id' : 'New Access Key Id'
      },
      secretAccessKeyLabel () {
        return this.isCreateMode ? 'Secret Access Key' : 'New Secret Access Key'
      },
      submitButtonText () {
        return this.isCreateMode ? 'Add Secret' : 'Replace Secret'
      },
      title () {
        return this.isCreateMode ? 'Add new AWS Secret' : 'Replace AWS Secret'
      }
    },
    methods: {
      ...mapActions([
        'createInfrastructureSecret',
        'updateInfrastructureSecret'
      ]),
      hide () {
        this.visible = false
      },
      cancel () {
        this.hide()
        this.$emit('cancel')
      },
      submit () {
        this.$v.$touch()
        if (this.valid) {
          this.save()
            .then(secret => {
              this.hide()
              this.$emit('submit', secret)
            })
        }
      },
      save () {
        const data = {
          accessKeyID: this.accessKeyId,
          secretAccessKey: this.secretAccessKey
        }

        if (this.isCreateMode) {
          const namespace = this.namespace
          const name = this.secretName
          const infrastructure = {
            kind: 'aws'
          }
          const metadata = {name, namespace, infrastructure}

          return this.createInfrastructureSecret({metadata, data})
        } else {
          const metadata = cloneDeep(this.secret.metadata)

          return this.updateInfrastructureSecret({metadata, data})
        }
      },
      reset () {
        this.$v.$reset()

        this.accessKeyId = ''
        this.secretAccessKey = ''

        if (this.isCreateMode) {
          this.secretName = 'my-aws-secret'
          setInputFocus(this, 'secretName')
        } else {
          this.secretName = this.secret.metadata ? this.secret.metadata.name : ''
          setInputFocus(this, 'accessKeyId')
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


<style lang="styl">
  .aws_credential {
    .card__title{
      background-image: url(../assets/aws_background.svg);
      background-size: cover;
      color:white;
      height:130px;
      span{
        font-size:30px !important
        padding-left:30px
        font-weight:400 !important
        padding-top:30px !important
      }
      .icon {
        font-size:90px !important;
      }
    }
  }
</style>
