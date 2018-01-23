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
    <v-card class="gce_credential">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-google</v-icon><span>{{title}}</span>
      </v-card-title>

      <v-card-text>
        <form>
          <v-container fluid>
            <v-layout row>
              <v-flex xs5>
                <template v-if="isCreateMode">
                  <v-text-field
                    ref="secretName"
                    color="green"
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
              <v-flex xs12>
                <v-text-field
                  ref="serviceAccountKey"
                  color="green"
                  v-model="serviceAccountKey"
                  :label="serviceAccountKeyLabel"
                  :error-messages="getErrorMessages('serviceAccountKey')"
                  @input="$v.serviceAccountKey.$touch()"
                  @blur="$v.serviceAccountKey.$touch()"
                  textarea
                  multi-line
                  hint="Enter or drop a service account key in JSON format"
                  persistent-hint
                ></v-text-field>
              </v-flex>
            </v-layout>
          </v-container>
        </form>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native="cancel">Cancel</v-btn>
        <v-btn flat @click.native="submit" class="green--text" :disabled="!valid">{{submitButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
  import { mapActions, mapState, mapGetters } from 'vuex'
  import { handleTextFieldDrop, getValidationErrors, setInputFocus } from '@/utils'
  import { required, maxLength } from 'vuelidate/lib/validators'
  import { unique, resourceName, serviceAccountKey } from '@/utils/validators'
  import cloneDeep from 'lodash/cloneDeep'

  const validationErrors = {
    secretName: {
      required: 'You can\'t leave this empty.',
      maxLength: 'It exceeds the maximum length of 128 characters.',
      resourceName: 'Please use only lowercase alphanumeric characters and hyphen',
      unique: 'Name is taken. Try another.'
    },
    serviceAccountKey: {
      required: 'You can\'t leave this empty.',
      serviceAccountKey: 'Not a valid Service Account Key'
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
        serviceAccountKey: undefined,
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
          serviceAccountKey: {
            required,
            serviceAccountKey
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
      projectId () {
        try {
          const key = JSON.parse(this.serviceAccountKey)
          const projectId = key.project_id ? key.project_id : ''
          return projectId
        } catch (err) {
          return ''
        }
      },
      infrastructureSecretNames () {
        return this.infrastructureSecretList.map(item => item.metadata.name)
      },
      isCreateMode () {
        return !this.secret
      },
      serviceAccountKeyLabel () {
        return this.isCreateMode ? 'Service Account Key' : 'New Service Account Key'
      },
      submitButtonText () {
        return this.isCreateMode ? 'Add Secret' : 'Replace Secret'
      },
      title () {
        return this.isCreateMode ? 'Add new Google Secret' : 'Replace Google Secret'
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
          project: this.projectId,
          'serviceaccount.json': this.serviceAccountKey
        }

        if (this.isCreateMode) {
          const namespace = this.namespace
          const name = this.secretName
          const infrastructure = {
            kind: 'gce'
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

        this.serviceAccountKey = ''

        if (this.isCreateMode) {
          this.secretName = 'my-gce-secret'
          setInputFocus(this, 'secretName')
        } else {
          this.secretName = this.secret.metadata ? this.secret.metadata.name : ''
          setInputFocus(this, 'serviceAccountKey')
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
    },
    mounted () {
      handleTextFieldDrop(this.$refs.serviceAccountKey, /json/)
    }
  }
</script>


<style lang="styl" scoped>
  .gce_credential {
    >>> .input-group--textarea textarea {
      font-family: monospace;
      font-size: 14px;
    }

    >>> .input-group--text-field.input-group--textarea:not(.input-group--full-width) .input-group__input {
       border: 1px solid rgba(0,0,0,0.3);
       background-color: rgba(0,20,0,0.02);
     }

    .card__title{
      background-image: url(../assets/gce_background.svg);
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

