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
    <v-card class="openstack_credential">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-server-network</v-icon><span>{{title}}</span>
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
                ref="domainName"
                v-model="domainName"
                :label="domainNameLabel"
                :error-messages="getErrorMessages('domainName')"
                @input="$v.domainName.$touch()"
                @blur="$v.domainName.$touch()"
              ></v-text-field>
            </v-flex>
          </v-layout>

          <v-layout row>
            <v-flex xs8>
              <v-text-field
                color="blue"
                ref="tenantName"
                v-model="tenantName"
                :label="tenantNameLabel"
                :error-messages="getErrorMessages('tenantName')"
                @input="$v.tenantName.$touch()"
                @blur="$v.tenantName.$touch()"
              ></v-text-field>
            </v-flex>
          </v-layout>

          <v-layout row>
            <v-flex xs8>
              <v-text-field
                color="blue"
                ref="authUrl"
                v-model="authUrl"
                :label="authUrlLabel"
                :error-messages="getErrorMessages('authUrl')"
                @input="$v.authUrl.$touch()"
                @blur="$v.authUrl.$touch()"
              ></v-text-field>
            </v-flex>
          </v-layout>

          <v-layout row>
            <v-flex xs8>
              <v-text-field
              color="blue"
              v-model="username"
              :label="usernameLabel"
              :error-messages="getErrorMessages('username')"
              @input="$v.username.$touch()"
              @blur="$v.username.$touch()"
              ></v-text-field>
            </v-flex>
          </v-layout>

          <v-layout row>
            <v-flex xs8>
              <v-text-field
                color="blue"
                v-model="password"
                :label="passwordLabel"
                :error-messages="getErrorMessages('password')"
                :append-icon="hideSecret ? 'visibility' : 'visibility_off'"
                :append-icon-cb="() => (hideSecret = !hideSecret)"
                :type="hideSecret ? 'password' : 'text'"
                @input="$v.password.$touch()"
                @blur="$v.password.$touch()"
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
  import { required, maxLength, url } from 'vuelidate/lib/validators'
  import { unique, resourceName } from '@/utils/validators'
  import cloneDeep from 'lodash/cloneDeep'

  const validationErrors = {
    secretName: {
      required: 'You can\'t leave this empty.',
      maxLength: 'It exceeds the maximum length of 128 characters.',
      resourceName: 'Please use only lowercase alphanumeric characters and hyphen',
      unique: 'Name is taken. Try another.'
    },
    domainName: {
      required: 'You can\'t leave this empty.'
    },
    tenantName: {
      required: 'You can\'t leave this empty.'
    },
    authUrl: {
      required: 'You can\'t leave this empty.',
      url: 'Must be a valid URL'
    },
    username: {
      required: 'You can\'t leave this empty.'
    },
    password: {
      required: 'You can\'t leave this empty.'
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
        domainName: undefined,
        tenantName: undefined,
        authUrl: undefined,
        username: undefined,
        password: undefined,
        hideSecret: true,
        domainNameLabel: 'Domain Name',
        tenantNameLabel: 'Tenant Name',
        authUrlLabel: 'Auth URL',
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
          domainName: {
            required
          },
          tenantName: {
            required
          },
          authUrl: {
            required,
            url
          },
          username: {
            required
          },
          password: {
            required
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
      usernameLabel () {
        return this.isCreateMode ? 'Username' : 'New Username'
      },
      passwordLabel () {
        return this.isCreateMode ? 'Password' : 'New Password'
      },
      submitButtonText () {
        return this.isCreateMode ? 'Add Secret' : 'Replace Secret'
      },
      title () {
        return this.isCreateMode ? 'Add new Openstack Secret' : 'Replace Openstack Secret'
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
          domainName: this.domainName,
          tenantName: this.tenantName,
          authUrl: this.authUrl,
          username: this.username,
          password: this.password
        }

        if (this.isCreateMode) {
          const namespace = this.namespace
          const name = this.secretName
          const infrastructure = {
            kind: 'openstack'
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

        this.domainName = ''
        this.tenantName = ''
        this.authUrl = ''
        this.username = ''
        this.password = ''

        if (this.isCreateMode) {
          this.secretName = 'my-openstack-secret'
          setInputFocus(this, 'secretName')
        } else {
          this.secretName = this.secret.metadata ? this.secret.metadata.name : ''
          if (this.secret.data) {
            this.domainName = this.secret.data.domainName
            this.tenantName = this.secret.data.tenantName
            this.authUrl = this.secret.data.authUrl
          }
          setInputFocus(this, 'domainName')
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
  .openstack_credential {
    .card__title{
      background-image: url(../assets/openstack_background.svg);
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
