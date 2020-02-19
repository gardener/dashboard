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
        <template v-if="isConfigDialog">
          <span v-if="isUserDialog">Configure user</span>
          <span v-if="isServiceDialog">Configure Service Account</span>
        </template>
        <template v-else>
          <span v-if="isUserDialog">Add user to Project</span>
          <span v-if="isServiceDialog">Add Service Account to Project</span>
        </template>
      </v-card-title>
      <v-card-text>
        <v-container grid-list-xl class="pa-0 ma-0">
          <v-layout row wrap>
            <v-flex xs8>
              <v-text-field
                :disabled="isConfigDialog"
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
            <v-flex xs4>
              <v-select
                :color="color"
                label="Roles"
                :items="allMemberRoles"
                multiple
                small-chips
                item-text="displayName"
                item-value="name"
                v-model="roles"
                :error-messages="getErrorMessages('roles')"
                @input="$v.roles.$touch()"
                >
                <template v-slot:selection="{ item, index }">
                  <v-chip small :color="color" text-color="white" close @input="roles.splice(index, 1)">
                    <span>{{ item.displayName }}</span>
                  </v-chip>
                </template>
              </v-select>
            </v-flex>
          </v-layout>
          <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.stop="cancel" tabindex="3">Cancel</v-btn>
        <v-btn v-if="isConfigDialog" flat @click.stop="submitConfigMember" :disabled="!valid" :class="buttonClass" tabindex="2">Update</v-btn>
        <v-btn v-else flat @click.stop="submitAddMember" :disabled="!valid" :class="buttonClass" tabindex="2">Add</v-btn>
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
import { serviceAccountToDisplayName, isServiceAccount, setInputFocus, allMemberRoles, getValidationErrors } from '@/utils'
import filter from 'lodash/filter'
import map from 'lodash/map'
import find from 'lodash/find'
import includes from 'lodash/includes'
import cloneDeep from 'lodash/cloneDeep'

const defaultUsername = ''
const defaultServiceName = 'robot'
const defaultRole = find(allMemberRoles, { name: 'admin' })

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
    username: {
      type: String
    },
    userroles: {
      type: Array
    }
  },
  data () {
    return {
      validationErrors: undefined,
      name: undefined,
      roles: undefined,
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
      'userList',
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
      const validators = {
        roles: {
          required
        }
      }
      if (this.isUserDialog) {
        validators.name = {
          required,
          unique: unique('projectMembersNames')
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
    isUserDialog () {
      return this.type === 'adduser' || this.type === 'configuser'
    },
    isServiceDialog () {
      return this.type === 'addservice' || this.type === 'configservice'
    },
    isConfigDialog () {
      return this.type === 'configuser' || this.type === 'configservice'
    },
    textField () {
      return this.$refs.name
    },
    allMemberRoles () {
      return allMemberRoles
    },
    color () {
      if (this.isUserDialog) {
        return 'green darken-2'
      } else if (this.isServiceDialog) {
        return 'blue-grey'
      }
      return ''
    },
    nameLabel () {
      if (this.isUserDialog) {
        return 'User'
      } else if (this.isServiceDialog) {
        return 'Service Account'
      }
      return ''
    },
    nameHint () {
      if (this.isUserDialog) {
        return 'Enter the username who should become member of this project'
      } else if (this.isServiceDialog) {
        return 'Enter the name of a Kubernetes Service Account'
      }
      return ''
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
      return map(filter(this.userList, ({ username }) => isServiceAccount(username)), serviceAccountName => this.serviceAccountDisplayName(serviceAccountName.username))
    },
    projectMembersNames () {
      return map(filter(this.userList, ({ username }) => !isServiceAccount(username)), 'username')
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
    async submitConfigMember () {
      this.$v.$touch()
      if (this.valid) {
        // TODO
      }
    },
    cancel () {
      this.$v.$reset()
      this.hide()
    },
    reset () {
      const validationErrors = {
        roles: {
          required: 'You need to configure roles'
        }
      }
      if (this.isUserDialog) {
        validationErrors.name = {
          required: 'User is required',
          unique: `User '${this.username}' is already member of this project.`
        }
      } else if (this.isServiceDialog) {
        validationErrors.name = {
          required: 'Service Account is required',
          resourceName: 'Must contain only alphanumeric characters or hypen',
          unique: `Service Account '${this.serviceAccountDisplayName(this.username)}' already exists. Please try a different name.`
        }
      }
      this.validationErrors = validationErrors

      this.$v.$reset()

      if (this.username) {
        this.name = this.username
      } else if (this.isUserDialog) {
        this.name = defaultUsername
      } else if (this.isServiceDialog) {
        this.name = this.defaultServiceName()
      }

      if (this.userroles) {
        this.roles = cloneDeep(this.userroles)
      } else {
        this.roles = [defaultRole]
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
