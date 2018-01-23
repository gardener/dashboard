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
    <v-card class="azure_credential">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-microsoft</v-icon><span>{{title}}</span>
      </v-card-title>

      <v-card-text>
        <v-container fluid>
          <v-layout row>
            <v-flex xs5>
              <template v-if="isCreateMode">
                <v-text-field
                  color="blue"
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
                color="blue"
                ref="clientId"
                v-model="clientId"
                :label="clientIdLabel"
              ></v-text-field>
            </v-flex>
          </v-layout>

          <v-layout row>
            <v-flex xs8>
              <v-text-field
                color="blue"
                v-model="clientSecret"
                :append-icon="hideSecret ? 'visibility' : 'visibility_off'"
                :append-icon-cb="() => (hideSecret = !hideSecret)"
                :type="hideSecret ? 'password' : 'text'"
                :label="clientSecretLabel"
              ></v-text-field>
            </v-flex>
          </v-layout>

          <v-layout row>
            <v-flex xs8>
              <v-text-field
                color="blue"
                v-model="tenantId"
                :label="tenantIdLabel"
              ></v-text-field>
            </v-flex>
          </v-layout>

          <v-layout row>
            <v-flex xs8>
              <v-text-field
                color="blue"
                v-model="subscriptionId"
                :label="subscriptionIdLabel"
              ></v-text-field>
            </v-flex>
          </v-layout>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native="cancel">Cancel</v-btn>
        <v-btn flat @click.native="submit" class="blue--text" :disabled="!valid">{{submitButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
  import { mapActions, mapState, mapGetters } from 'vuex'
  import { getValidationErrors, setInputFocus } from '@/utils'
  import { required, maxLength } from 'vuelidate/lib/validators'
  import { unique, resourceName } from '@/utils/validators'
  import cloneDeep from 'lodash/cloneDeep'

  const validationErrors = {
    secretName: {
      required: 'You can\'t leave this empty.',
      maxLength: 'It exceeds the maximum length of 128 characters.',
      resourceName: 'Please use only lowercase alphanumeric characters and hyphen',
      unique: 'Name is taken. Try another.'
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
        clientId: undefined,
        clientSecret: undefined,
        tenantId: undefined,
        subscriptionId: undefined,
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
      clientIdLabel () {
        return this.isCreateMode ? 'Client Id' : 'New Client Id'
      },
      clientSecretLabel () {
        return this.isCreateMode ? 'Client Secret' : 'New Client Secret'
      },
      tenantIdLabel () {
        return this.isCreateMode ? 'Tenant Id' : 'New Tenant Id'
      },
      subscriptionIdLabel () {
        return this.isCreateMode ? 'Subscription Id' : 'New Subscription Id'
      },
      submitButtonText () {
        return this.isCreateMode ? 'Add Secret' : 'Replace Secret'
      },
      title () {
        return this.isCreateMode ? 'Add new Azure Secret' : 'Replace Azure Secret'
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
          clientID: this.clientId,
          clientSecret: this.clientSecret,
          subscriptionID: this.subscriptionId,
          tenantID: this.tenantId
        }

        if (this.isCreateMode) {
          const namespace = this.namespace
          const name = this.secretName
          const infrastructure = {
            kind: 'azure'
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

        this.clientId = ''
        this.clientSecret = ''
        this.subscriptionId = ''
        this.tenantId = ''

        if (this.isCreateMode) {
          this.secretName = 'my-azure-secret'
          setInputFocus(this, 'secretName')
        } else {
          this.secretName = this.secret.metadata ? this.secret.metadata.name : ''
          setInputFocus(this, 'clientId')
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
  .azure_credential {
    .card__title{
      background-image: url(../assets/azure_background.svg);
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
