<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-card class="add_member" :class="cardClass">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-account-plus</v-icon>
        <span v-if="isUserDialog">Add user to Project</span>
        <span v-if="isServiceDialog">Add Service Account to Project</span>
      </v-card-title>

      <v-card-text>
          <v-text-field
            v-if="isUserDialog"
            color="green darken-2"
            ref="username"
            label="User"
            v-model="username"
            :error-messages="usernameErrors"
            @input="$v.username.$touch()"
            @keyup.enter="submit()"
            hint="Enter the name of a user who should become member of this project"
            persistent-hint
            tabindex="1"
          ></v-text-field>
          <v-text-field
            v-if="isServiceDialog"
            color="blue-grey"
            ref="serviceAccountName"
            label="Service Account"
            v-model="serviceAccountName"
            :error-messages="serviceAccountNameErrors"
            @input="$v.serviceAccountName.$touch()"
            @keyup.enter="submit()"
            hint="Enter the name of a Kubernetes Service Account"
            persistent-hint
            tabindex="1"
          ></v-text-field>
          <alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.stop="cancel" tabindex="3">Cancel</v-btn>
        <v-btn flat @click.stop="submit" :disabled="!valid" :class="buttonClass" tabindex="2">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import toLower from 'lodash/toLower'
import { mapActions, mapState, mapGetters } from 'vuex'
import { required } from 'vuelidate/lib/validators'
import { resourceName, unique } from '@/utils/validators'
import Alert from '@/components/Alert'
import { errorDetailsFromError, isConflict } from '@/utils/error'
import { serviceAccountToDisplayName } from '@/utils'
import filter from 'lodash/filter'
import startsWith from 'lodash/startsWith'
import map from 'lodash/map'
import includes from 'lodash/includes'

const defaultUsername = ''
const defaultServiceName = 'robot'

export default {
  name: 'add-member-dialog',
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
      username: defaultUsername,
      serviceAccountName: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined
    }
  },
  validations () {
    if (this.isUserDialog) {
      return {
        username: {
          required,
          unique: unique('projectMembersNames')
        }
      }
    } else if (this.isServiceDialog) {
      return {
        serviceAccountName: {
          required,
          resourceName,
          unique: unique('serviceAccountNames')
        }
      }
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'memberList',
      'projectList'
    ]),
    visible: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    usernameErrors () {
      const errors = []
      if (!this.$v.username.$dirty) {
        return errors
      }
      if (!this.$v.username.required) {
        errors.push('User is required')
      }
      if (!this.$v.username.unique) {
        errors.push(`User '${this.username}' is already member of this project.`)
      }
      return errors
    },
    serviceAccountNameErrors () {
      const errors = []
      if (!this.$v.serviceAccountName.$dirty) {
        return errors
      }
      if (!this.$v.serviceAccountName.required) {
        errors.push('Service Account is required')
      }
      if (!this.$v.serviceAccountName.resourceName) {
        errors.push('Must contain only alphanumeric characters or hypen')
      }
      if (!this.$v.serviceAccountName.unique) {
        errors.push(`Service Account '${this.serviceAccountDisplayName(this.serviceAccountName)}' already exists. Please try a different name.`)
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
        return this.$refs.username
      } else if (this.isServiceDialog) {
        return this.$refs.serviceAccountName
      }
      return undefined
    },
    cardClass () {
      if (this.isUserDialog) {
        return 'add_user'
      } else if (this.isServiceDialog) {
        return 'add_service'
      }
      return ''
    },
    buttonClass () {
      if (this.isUserDialog) {
        return 'green--text darken-2'
      } else if (this.isServiceDialog) {
        return 'blue-grey--text'
      }
      return ''
    },
    serviceAccountNames () {
      const predicate = username => startsWith(username, `system:serviceaccount:${this.namespace}:`)
      return map(filter(this.memberList, predicate), serviceAccountName => this.serviceAccountDisplayName(serviceAccountName))
    },
    projectMembersNames () {
      const predicate = username => !startsWith(username, 'system:serviceaccount:')
      return filter(this.memberList, predicate)
    }
  },
  methods: {
    ...mapActions([
      'addMember'
    ]),
    hide () {
      this.visible = false
    },
    async submit () {
      this.$v.$touch()
      if (this.valid) {
        try {
          await this.save()
          this.hide()
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          if (isConflict(err)) {
            if (this.isUserDialog) {
              this.errorMessage = `User '${this.username}' is already member of this project.`
            } else if (this.isServiceDialog) {
              this.errorMessage = `Service account '${this.serviceAccountDisplayName(this.serviceAccountName)}' already exists. Please try a different name.`
            }
          } else {
            this.errorMessage = 'Failed to add project member'
          }
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        }
      }
    },
    cancel () {
      this.$v.$reset()
      this.$nextTick(() => this.hide())
    },
    reset () {
      this.$v.$reset()
      this.username = defaultUsername
      this.serviceAccountName = this.defaultServiceName()

      this.errorMessage = undefined
      this.detailedMessage = undefined

      this.setFocusAndSelection()
    },
    setFocusAndSelection () {
      if (this.textField) {
        const input = this.textField.$refs.input
        this.$nextTick(() => {
          input.focus()
        })
      }
    },
    save () {
      if (this.isUserDialog) {
        const username = toLower(this.username)
        return this.addMember(username)
      } else if (this.isServiceDialog) {
        const namespace = this.namespace
        const name = toLower(this.serviceAccountName)
        return this.addMember(`system:serviceaccount:${namespace}:${name}`)
      }
    },
    serviceAccountDisplayName (serviceAccountName) {
      return serviceAccountToDisplayName(serviceAccountName)
    },
    defaultServiceName () {
      let name = defaultServiceName
      let counter = 1
      while (includes(this.serviceAccountNames, name)) {
        name = `${defaultServiceName}-${counter}`
        counter++
      }

      return name
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
    if (this.textField) {
      const input = this.textField.$refs.input
      input.style.textTransform = 'lowercase'
    }
  }
}
</script>

<style lang="styl" scoped>
  .add_member {
    .v-card__title{
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
  .add_user {
    .v-card__title{
      background-image: url(../assets/add_user_background.svg);
    }
  }
  .add_service {
    .v-card__title{
      background-image: url(../assets/add_service_background.svg);
    }
  }
</style>
