<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog
    v-model="visible"
    max-width="650"
    persistent
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-account-plus"
        :title="title"
      />
      <v-card-text>
        <v-container class="px-0">
          <v-row>
            <v-col cols="7">
              <v-text-field
                ref="internalName"
                v-model.trim="internalName"
                :disabled="isUpdateDialog"
                color="primary"
                :label="nameLabel"
                :error-messages="getErrorMessages('internalName')"
                :hint="nameHint"
                persistent-hint
                tabindex="1"
                variant="underlined"
                @update:model-value="v$.$touch()"
                @keyup.enter="submitAddMember()"
              />
            </v-col>
            <v-col cols="5">
              <v-select
                v-model="internalRoles"
                color="primary"
                label="Roles"
                :items="roleItems"
                multiple
                item-title="displayName"
                item-value="name"
                :error-messages="getErrorMessages('internalRoles')"
                :hint="rolesHint"
                persistent-hint
                tabindex="2"
                variant="underlined"
                @update:model-value="v$.internalRoles.$touch()"
              >
                <template #selection="{ item, index }">
                  <v-chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    closable
                    @update:model-value="internalRoles.splice(index, 1); v$.internalRoles.$touch()"
                  >
                    <span>{{ item.raw.displayName }}</span>
                  </v-chip>
                </template>
              </v-select>
            </v-col>
          </v-row>
          <v-row v-if="isServiceDialog && !isForeignServiceAccount">
            <v-col cols="12">
              <v-text-field
                v-model.trim="internalDescription "
                color="primary"
                label="Description"
                tabindex="3"
                variant="underlined"
                @keyup.enter="submitAddMember() "
              />
            </v-col>
          </v-row>
          <v-row class="mt-3">
            <v-alert
              v-if="isUpdateDialog && orphaned"
              :value="true"
              type="info"
              color="primary"
              variant="outlined"
            >
              The service account does not exist anymore and will be re-created if you update the roles.
            </v-alert>
            <g-message
              v-model:message="errorMessage"
              v-model:detailed-message="detailedErrorMessage"
              color="error"
            />
          </v-row>
        </v-container>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          tabindex="5"
          @click.stop="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          v-if="isUpdateDialog"
          variant="text"
          :disabled="!valid"
          class="text-primary"
          tabindex="4"
          @click.stop="submitUpdateMember"
        >
          Update
        </v-btn>
        <v-btn
          v-else
          variant="text"
          :disabled="!valid"
          class="text-primary"
          tabindex="4"
          @click.stop="submitAddMember"
        >
          {{ addMemberButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import {
  mapActions,
  mapState,
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  requiredIf,
} from '@vuelidate/validators'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useMemberStore } from '@/store/member'

import GMessage from '@/components/GMessage.vue'
import GToolbar from '@/components/GToolbar.vue'

import {
  resourceName,
  unique,
} from '@/utils/validators'
import {
  errorDetailsFromError,
  isConflict,
} from '@/utils/error'
import {
  parseServiceAccountUsername,
  isServiceAccountUsername,
  setDelayedInputFocus,
  getValidationErrors,
  isForeignServiceAccount,
  MEMBER_ROLE_DESCRIPTORS,
} from '@/utils'

import {
  toLower,
  filter,
  map,
  includes,
  forEach,
  find,
  negate,
  get,
} from '@/lodash'

const defaultUsername = ''
const defaultServiceName = 'robot'

export default {
  components: {
    GMessage,
    GToolbar,
  },
  inject: ['logger'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    roles: {
      type: Array,
    },
    isCurrentUser: {
      type: Boolean,
    },
    orphaned: {
      type: Boolean,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      internalName: undefined,
      internalRoles: undefined,
      internalDescription: undefined,
      unsupportedRoles: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    ...mapState(useAuthzStore, ['namespace']),
    ...mapState(useMemberStore, {
      memberList: 'list',
    }),
    ...mapState(useAuthnStore, ['isAdmin']),
    visible: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
    valid () {
      return !this.v$.$invalid
    },
    validators () {
      const validators = {
        internalRoles: {
          required: requiredIf(function () {
            return this.isForeignServiceAccount || this.isUserDialog
          }),
        },
        internalName: {},
      }
      if (!this.isUpdateDialog) {
        if (this.isUserDialog) {
          validators.internalName = {
            required,
            unique: unique('projectUsernames'),
            isNoServiceAccount: value => !isServiceAccountUsername(value),
          }
        } else if (this.isServiceDialog) {
          const serviceAccountKeyFunc = (value) => {
            return isServiceAccountUsername(value)
              ? 'serviceAccountUsernames'
              : 'serviceAccountNames'
          }
          validators.internalName = {
            required,
            serviceAccountResource: value => {
              if (isServiceAccountUsername(this.internalName)) {
                return true
              }
              return resourceName(value)
            },
            unique: unique(serviceAccountKeyFunc),
          }
        }
      }
      return validators
    },
    validationErrors () {
      const validationErrors = {}
      if (this.isUserDialog) {
        validationErrors.internalRoles = {
          required: 'You need to assign roles to this user',
        }
        validationErrors.internalName = {
          required: 'User is required',
          unique: `User '${this.internalName}' is already member of this project.`,
          isNoServiceAccount: 'Please use add service account to add service accounts',
        }
      } else if (this.isServiceDialog) {
        validationErrors.internalRoles = {
          required: 'You need to assign roles for service accounts that you want to invite to this project',
        }
        validationErrors.internalName = {
          required: 'Service Account is required',
          resourceName: 'Must contain only alphanumeric characters or hypen',
          serviceAccountResource: 'Name must contain only alphanumeric characters or hypen. You can also specify the service account prefix if you want to add a service account from another namespace',
          unique: `Service Account '${this.internalName}' already exists. Please try a different name.`,
        }
      }
      return validationErrors
    },
    title () {
      if (this.isUpdateDialog) {
        return `Change Roles of ${this.nameLabel}`
      }
      if (this.isServiceDialog) {
        if (this.isForeignServiceAccount) {
          return 'Invite Service Account'
        }
        return 'Create Service Account'
      }
      if (this.isUserDialog) {
        return 'Add User to Project'
      }
      return undefined
    },
    isForeignServiceAccount () {
      return isForeignServiceAccount(this.namespace, this.internalName)
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
    roleItems () {
      return filter(MEMBER_ROLE_DESCRIPTORS, role => {
        return !role.notEditable
      })
    },
    nameLabel () {
      return this.isUserDialog ? 'User' : 'Service Account'
    },
    nameHint () {
      if (this.isUserDialog) {
        return 'Enter the username that should become a member of this project'
      }
      if (this.isServiceDialog) {
        return 'Enter service account name'
      }

      return undefined
    },
    rolesHint () {
      if (this.isServiceDialog) {
        return 'Assign roles to make this service account a member of this project'
      }
      return undefined
    },
    memberUsernames () {
      return map(this.memberList, 'username')
    },
    serviceAccountUsernames () {
      return filter(this.memberUsernames, isServiceAccountUsername)
    },
    serviceAccountNames () {
      return map(this.serviceAccountUsernames, username => get(parseServiceAccountUsername(username), 'name'))
    },
    projectUsernames () {
      return filter(this.memberUsernames, negate(isServiceAccountUsername))
    },
    memberName () {
      const name = toLower(this.internalName)
      if (this.isUserDialog) {
        return name
      }
      if (this.isServiceDialog) {
        if (isServiceAccountUsername(name)) {
          return name
        }
        return `system:serviceaccount:${this.namespace}:${name}`
      }
      return undefined
    },
    addMemberButtonText () {
      if (this.isServiceDialog) {
        if (this.isForeignServiceAccount) {
          return 'Invite'
        }
        return 'Create'
      }
      return 'Add'
    },
  },
  watch: {
    modelValue: function (value) {
      if (value) {
        this.reset()
      }
    },
  },
  methods: {
    ...mapActions(useAuthzStore, [
      'refreshRules',
    ]),
    ...mapActions(useMemberStore, [
      'addMember',
      'updateMember',
    ]),
    hide () {
      this.visible = false
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    async submitAddMember () {
      this.v$.$touch()
      if (this.valid) {
        const name = this.memberName
        const roles = this.internalRoles
        try {
          await this.addMember({ name, roles, description: this.internalDescription })
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
          this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        }
      }
    },
    async submitUpdateMember () {
      this.v$.$touch()
      if (this.valid) {
        try {
          const name = this.memberName
          const roles = [...this.internalRoles, ...this.unsupportedRoles]
          await this.updateMember(name, { roles, description: this.internalDescription })

          if (this.isCurrentUser && !this.isAdmin) {
            await this.refreshRules()
          }
          this.hide()
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Failed to update project member'
          this.detailedErrorMessage = errorDetails.detailedMessage
          this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        }
      }
    },
    cancel () {
      this.v$.$reset()
      this.hide()
    },
    reset () {
      this.v$.$reset()

      this.internalDescription = this.description
      if (this.isUserDialog) {
        if (this.name) {
          this.internalName = this.name
        } else {
          this.internalName = defaultUsername
        }
      } else if (this.isServiceDialog) {
        if (this.name) {
          this.internalName = this.name
          if (!this.isForeignServiceAccount) {
            this.internalName = get(parseServiceAccountUsername(this.name), 'name')
          }
        } else {
          this.internalName = this.defaultServiceName()
        }
      }

      if (this.roles) {
        this.internalRoles = []
        this.unsupportedRoles = []
        forEach(this.roles, role => {
          if (find(this.roleItems, { name: role })) {
            this.internalRoles.push(role)
          } else {
            this.unsupportedRoles.push(role)
          }
        })
      } else {
        this.internalRoles = []
        this.unsupportedRoles = []
      }

      this.errorMessage = undefined
      this.detailedMessage = undefined

      this.setFocusAndSelection()
    },
    setFocusAndSelection () {
      setDelayedInputFocus(this, 'internalName')
    },
    defaultServiceName () {
      let name = defaultServiceName
      let counter = 1
      while (includes(this.serviceAccountNames, name)) {
        name = `${defaultServiceName}-${counter}`
        counter++
      }

      return name
    },
  },
}
</script>
