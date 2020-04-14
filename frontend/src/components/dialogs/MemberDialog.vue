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
        <v-container  class="pa-0 ma-0">
          <v-row >
            <v-col cols="8">
              <v-text-field
                :disabled="isUpdateDialog"
                color="black"
                ref="internalName"
                :label="nameLabel"
                v-model.trim="internalName"
                :error-messages="getErrorMessages('internalName')"
                @input="$v.internalName.$touch()"
                @keyup.enter="submitAddMember()"
                :hint="nameHint"
                persistent-hint
                tabindex="1"
              ></v-text-field>
            </v-col>
            <v-col cols="4">
              <v-select
                color="black"
                label="Roles"
                :items="roleItems"
                multiple
                small-chips
                item-text="displayName"
                item-value="name"
                v-model="internalRoles"
                :error-messages="getErrorMessages('internalRoles')"
                @input="$v.internalRoles.$touch()"
                >
                <template v-slot:selection="{ item, index }">
                  <v-chip small color="black" outlined close @input="internalRoles.splice(index, 1); $v.internalRoles.$touch()">
                    <span>{{ item.displayName }}</span>
                  </v-chip>
                </template>
              </v-select>
            </v-col>
          </v-row>
          <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click.stop="cancel" tabindex="3">Cancel</v-btn>
        <v-btn v-if="isUpdateDialog" text @click.stop="submitUpdateMember" :disabled="!valid" class="black--text" tabindex="2">Update</v-btn>
        <v-btn v-else text @click.stop="submitAddMember" :disabled="!valid" class="black--text" tabindex="2">Add</v-btn>
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
import { serviceAccountToDisplayName, isServiceAccount, setInputFocus, getValidationErrors, MEMBER_ROLE_DESCRIPTORS } from '@/utils'
import filter from 'lodash/filter'
import map from 'lodash/map'
import includes from 'lodash/includes'

const defaultUsername = ''
const defaultServiceName = 'robot'
const defaultRole = 'admin'

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
    name: {
      type: String
    },
    roles: {
      type: Array
    },
    isCurrentUser: {
      type: Boolean
    }
  },
  data () {
    return {
      internalName: undefined,
      internalRoles: undefined,
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
      'projectList',
      'isAdmin'
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
        internalRoles: {
          required
        },
        internalName: {}
      }
      if (!this.isUpdateDialog) {
        if (this.isUserDialog) {
          validators.internalName = {
            required,
            unique: unique('projectUserNames')
          }
        } else if (this.isServiceDialog) {
          validators.internalName = {
            required,
            resourceName,
            unique: unique('serviceAccountNames')
          }
        }
      }
      return validators
    },
    validationErrors () {
      const validationErrors = {
        internalRoles: {
          required: 'You need to configure roles'
        }
      }
      if (this.isUserDialog) {
        validationErrors.internalName = {
          required: 'User is required',
          unique: `User '${this.internalName}' is already member of this project.`
        }
      } else if (this.isServiceDialog) {
        validationErrors.internalName = {
          required: 'Service Account is required',
          resourceName: 'Must contain only alphanumeric characters or hypen',
          unique: `Service Account '${this.internalName}' already exists. Please try a different name.`
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
      return this.$refs.internalName
    },
    roleItems () {
      return filter(MEMBER_ROLE_DESCRIPTORS, role => role.hidden !== true)
    },
    nameLabel () {
      if (this.isUserDialog) {
        return 'User'
      }
      if (this.isServiceDialog) {
        return 'Service Account'
      }
      return undefined
    },
    nameHint () {
      if (this.isUserDialog) {
        return 'Enter the username that should become a user of this project'
      }
      if (this.isServiceDialog) {
        return 'Enter the name of a Kubernetes Service Account'
      }
      return undefined
    },
    cardClass () {
      if (this.isUserDialog) {
        return 'add_user'
      }
      if (this.isServiceDialog) {
        return 'add_service'
      }
      return undefined
    },
    serviceAccountNames () {
      const serviceAccounts = filter(this.memberList, ({ username }) => isServiceAccount(username))
      return map(serviceAccounts, ({ username }) => serviceAccountToDisplayName(username))
    },
    projectUserNames () {
      const users = filter(this.memberList, ({ username }) => !isServiceAccount(username))
      return map(users, 'username')
    },
    memberName () {
      const name = toLower(this.internalName)
      if (this.isUserDialog) {
        return name
      }
      if (this.isServiceDialog) {
        return `system:serviceaccount:${this.namespace}:${name}`
      }
      return undefined
    }
  },
  methods: {
    ...mapActions([
      'addMember',
      'updateMember',
      'refreshSubjectRules'
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
          const name = this.memberName
          const roles = this.internalRoles
          await this.addMember({ name, roles })
          this.hide()
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          if (isConflict(err)) {
            if (this.isUserDialog) {
              this.errorMessage = `User '${name}' is already member of this project.`
            } else if (this.isServiceDialog) {
              this.errorMessage = `Service account '${name}' already exists. Please try a different name.`
            }
          } else {
            this.errorMessage = 'Failed to add project member'
          }
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        }
      }
    },
    async submitUpdateMember () {
      this.$v.$touch()
      if (this.valid) {
        try {
          const name = this.memberName
          const roles = this.internalRoles
          await this.updateMember({ name, roles })
          if (this.isCurrentUser && !this.isAdmin) {
            await this.refreshSubjectRules()
          }
          this.hide()
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Failed to update project member'
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

      if (this.isUserDialog) {
        if (this.name) {
          this.internalName = this.name
        } else {
          this.internalName = defaultUsername
        }
      } else if (this.isServiceDialog) {
        if (this.name) {
          this.internalName = serviceAccountToDisplayName(this.name)
        } else {
          this.internalName = this.defaultServiceName()
        }
      }

      if (this.roles) {
        this.internalRoles = [...this.roles]
      } else {
        this.internalRoles = [defaultRole]
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

<style lang="scss" scoped>
  .add_member {
    .v-card__title{
      background-size: cover;
      color: white;
      height: 130px;
      span{
        font-size: 25px !important;
        padding-left: 30px;
        font-weight: 400 !important;
        padding-top: 15px !important;
      }
      .icon {
        font-size: 50px !important;
      }
    }
  }
  .add_user {
    .v-card__title{
      background-image: url('../../assets/add_user_background.svg');
    }
  }
  .add_service {
    .v-card__title{
      background-image: url('../../assets/add_service_background.svg');
    }
  }
</style>
