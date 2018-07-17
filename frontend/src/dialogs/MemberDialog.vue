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

<template >
  <v-dialog v-model="visible" max-width="650">
    <v-card class="add_user_to_project">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-account-plus</v-icon>
        <span v-if="isUserDialog">Assign user to Project</span>
        <span v-if="isServiceDialog">Add Service Account to Project</span>
      </v-card-title>

      <v-card-text>
          <v-text-field
            v-if="isUserDialog"
            color="green"
            ref="email"
            label="Email"
            v-model="email"
            :error-messages="emailErrors"
            @input="$v.email.$touch()"
            @blur="$v.email.$touch()"
            required
            tabindex="1"
          ></v-text-field>
          <v-text-field
            v-if="isServiceDialog"
            color="green"
            ref="serviceaccountName"
            label="Service Account"
            v-model="serviceaccountName"
            :error-messages="serviceaccountNameErrors"
            @input="$v.serviceaccountName.$touch()"
            @blur="$v.serviceaccountName.$touch()"
            required
            tabindex="1"
          ></v-text-field>
          <alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.stop="cancel" tabindex="3">Cancel</v-btn>
        <v-btn flat @click.stop="submit" :disabled="!valid" class="green--text" tabindex="2">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import toLower from 'lodash/toLower'
  import { mapActions, mapState } from 'vuex'
  import { required, email } from 'vuelidate/lib/validators'
  import { resourceName } from '@/utils/validators'
  import Alert from '@/components/Alert'
  import { errorDetailsFromError, isConflict } from '@/utils/error'
  import split from 'lodash/split'
  import last from 'lodash/last'

  const defaultEmail = 'john.doe@example.org'
  const defaultServiceName = 'robot'

  export default {
    name: 'member-dialog',
    components: {
      Alert
    },
    props: {
      value: {
        type: Boolean,
        required: true
      },
      type: {
        type: String,
        required: true
      }
    },
    data () {
      return {
        email: defaultEmail,
        serviceaccountName: defaultServiceName,
        errorMessage: undefined,
        detailedErrorMessage: undefined
      }
    },
    validations: {
      email: {
        required,
        email
      },
      serviceaccountName: {
        required,
        resourceName
      }
    },
    computed: {
      ...mapState([
        'namespace'
      ]),
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      },
      emailErrors () {
        const errors = []
        if (!this.$v.email.$dirty) {
          return errors
        }
        if (!this.$v.email.required) {
          errors.push('E-mail is required')
        }
        if (!this.$v.email.email) {
          errors.push('Must be valid e-mail')
        }
        return errors
      },
      serviceaccountNameErrors () {
        const errors = []
        if (!this.$v.serviceaccountName.$dirty) {
          return errors
        }
        if (!this.$v.serviceaccountName.required) {
          errors.push('Service Account is required')
        }
        if (!this.$v.serviceaccountName.resourceName) {
          errors.push('Must contain only alphanumeric characters or hypen')
        }
        return errors
      },
      valid () {
        return !this.$v.$invalid
      },
      isUserDialog () {
        return this.type === 'user'
      },
      isServiceDialog () {
        return this.type === 'service'
      },
      textField () {
        if (this.isUserDialog) {
          return this.$refs.email
        } else if (this.isServiceDialog) {
          return this.$refs.serviceaccountName
        }
        return undefined
      }
    },
    methods: {
      ...mapActions([
        'addMember'
      ]),
      hide () {
        this.visible = false
      },
      submit () {
        this.$v.$touch()
        const hide = () => this.hide()
        if (this.valid) {
          this.save()
            .then(hide)
            .catch(err => {
              if (isConflict(err)) {
                if (this.isUserDialog) {
                  this.errorMessage = `User '${this.email}' is already member of this project.`
                } else if (this.isServiceDialog) {
                  this.errorMessage = `Serviceaccount '${last(split(this.serviceaccountName, ':'))}' already exists. Please try a different name.`
                }
              } else {
                this.errorMessage = 'Failed to add project member'
              }

              const errorDetails = errorDetailsFromError(err)
              console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
              this.detailedErrorMessage = errorDetails.detailedMessage
            })
        }
      },
      cancel () {
        this.hide()
      },
      reset () {
        this.$v.$reset()
        this.email = defaultEmail
        this.serviceaccountName = defaultServiceName

        this.errorMessage = undefined
        this.detailedMessage = undefined

        this.setFocusAndSelection()
      },
      setFocusAndSelection () {
        if (this.textField) {
          const input = this.textField.$refs.input
          this.$nextTick(() => {
            input.focus()
            input.setSelectionRange(0, 8)
          })
        }
      },
      save () {
        if (this.isUserDialog) {
          const email = toLower(this.email)
          return this.addMember(email)
        } else if (this.isServiceDialog) {
          const namespace = this.namespace
          const name = toLower(this.serviceaccountName)
          return this.addMember(`system:serviceaccount:${namespace}:${name}`)
        }
      }
    },
    watch: {
      value: function (value) {
        if (value) {
          this.reset()
        }
      }
    },
    created () {
      this.$bus.$on('esc-pressed', () => {
        this.cancel()
      })
    },
    mounted () {
      if (this.textField) {
        const input = this.textField.$refs.input
        input.style.textTransform = 'lowercase'
      }
    }
  }
</script>

<style lang="styl">
  .add_user_to_project {
    .card__title{
      background-image: url(../assets/add_user_background.svg);
      background-size: cover;
      color:white;
      height:130px;
      span{
        font-size:25px !important
        padding-left:30px
        font-weight:400 !important
        padding-top:15px !important
      }
      .icon {
        font-size: 50px !important;
      }
    }
  }
</style>
