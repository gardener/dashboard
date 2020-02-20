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
        <template v-if="isUpdateDialog">
          <span v-if="isUserDialog">Update User</span>
          <span v-if="isServiceDialog">Update Service Account</span>
        </template>
        <template v-else>
          <span v-if="isUserDialog">Add User to Project</span>
          <span v-if="isServiceDialog">Add Service Account to Project</span>
        </template>
      </v-card-title>
      <v-card-text>
        <v-container grid-list-xl class="pa-0 ma-0">
          <v-layout row wrap>
            <v-flex xs12>
              <v-text-field
                :disabled="isUpdateDialog"
                :color="color"
                ref="name"
                :label="nameLabel"
                v-model.trim="name"
                :error-messages="getErrorMessages('name')"
                @input="$v.name.$touch()"
                @keyup.enter="submitAddMember()"
                :hint="nameHint"
                persistent-hint
                tabindex="1"
              ></v-text-field>
            </v-flex>
          </v-layout>
          <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
        </v-container>
      </v-card-text>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.stop="cancel" tabindex="3">Cancel</v-btn>
        <v-btn flat @click.stop="submitAddMember" :disabled="!valid" :class="buttonClass" tabindex="2">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import toLower from 'lodash/toLower'
import { mapActions, mapState, mapGetters } from 'vuex'
import { required } from 'vuelidate/lib/validators'
import { resourceName, unique } from '@/utils/validators'
import GAlert from '@/components/GAlert'
import { errorDetailsFromError, isConflict } from '@/utils/error'
import { serviceAccountToDisplayName, isServiceAccount, setInputFocus, getValidationErrors } from '@/utils'
import filter from 'lodash/filter'
import map from 'lodash/map'
import includes from 'lodash/includes'

const defaultUsername = ''
const defaultServiceName = 'robot'

export default {
  name: 'member-dialog',
  components: {
    GAlert
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    oldName: {
      type: String
    }
  },
  data () {
    return {
      name: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined
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
    valid () {
      return !this.$v.$invalid
    },
    validators () {
      const validators = {}
      if (this.isUserDialog) {
        validators.name = {
          required,
          unique: unique('projectUserNames')
        }
      } else if (this.isServiceDialog) {
        validators.name = {
          required,
          resourceName,
          unique: unique('serviceAccountNames')
        }
      }
      return validators
    },
    validationErrors () {
      const validationErrors = {}
      if (this.isUserDialog) {
        validationErrors.name = {
          required: 'User is required',
          unique: `User '${this.name}' is already member of this project.`
        }
      } else if (this.isServiceDialog) {
        validationErrors.name = {
          required: 'Service Account is required',
          resourceName: 'Must contain only alphanumeric characters or hypen',
          unique: `Service Account '${this.serviceAccountDisplayName(this.name)}' already exists. Please try a different name.`
        }
      }
      return validationErrors
    },
    isUserDialog () {
      return this.type === 'adduser' || this.type === 'updateuser'
    },
    isServiceDialog () {
      return this.type === 'addservice' || this.type === 'updateservice'
    },
    isUpdateDialog () {
      return this.type === 'updateuser' || this.type === 'updateservice'
    },
    textField () {
      return this.$refs.name
    },
    color () {
      if (this.isUserDialog) {
        return 'green darken-2'
      } else if (this.isServiceDialog) {
        return 'blue-grey'
      }
      return undefined
    },
    nameLabel () {
      if (this.isUserDialog) {
        return 'User'
      } else if (this.isServiceDialog) {
        return 'Service Account'
      }
      return undefined
    },
    nameHint () {
      if (this.isUserDialog) {
        return 'Enter the username that should become a user of this project'
      } else if (this.isServiceDialog) {
        return 'Enter the name of a Kubernetes Service Account'
      }
      return undefined
    },
    cardClass () {
      if (this.isUserDialog) {
        return 'add_user'
      } else if (this.isServiceDialog) {
        return 'add_service'
      }
      return undefined
    },
    buttonClass () {
      if (this.isUserDialog) {
        return 'green--text darken-2'
      } else if (this.isServiceDialog) {
        return 'blue-grey--text'
      }
      return undefined
    },
    serviceAccountNames () {
      return map(filter(this.memberList, ({ username }) => isServiceAccount(username)), serviceAccountName => this.serviceAccountDisplayName(serviceAccountName.username))
    },
    projectUserNames () {
      return map(filter(this.memberList, ({ username }) => !isServiceAccount(username)), 'username')
    }
  },
  methods: {
    ...mapActions([
      'addMember'
    ]),
    hide () {
      this.visible = false
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    async submitAddMember () {
      this.$v.$touch()
      if (this.valid) {
        try {
          await this.save()
          this.hide()
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          if (isConflict(err)) {
            if (this.isUserDialog) {
              this.errorMessage = `User '${this.name}' is already member of this project.`
            } else if (this.isServiceDialog) {
              this.errorMessage = `Service account '${this.serviceAccountDisplayName(this.name)}' already exists. Please try a different name.`
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
      this.hide()
    },
    reset () {
      this.$v.$reset()

      if (this.oldName) {
        this.name = this.oldName
      } else if (this.isUserDialog) {
        this.name = defaultUsername
      } else if (this.isServiceDialog) {
        this.name = this.defaultServiceName()
      }

      this.errorMessage = undefined
      this.detailedMessage = undefined

      this.setFocusAndSelection()
    },
    setFocusAndSelection () {
      if (this.textField) {
        setInputFocus(this, 'name')
      }
    },
    save () {
      if (this.isUserDialog) {
        const username = toLower(this.name)
        return this.addMember(username)
      } else if (this.isServiceDialog) {
        const namespace = this.namespace
        const name = toLower(this.name)
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
