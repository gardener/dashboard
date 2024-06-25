<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-dialog
    v-model="visible"
    persistent
    scrollable
    max-width="600"
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-cube"
        title="Create Project"
      />
      <v-card-text class="dialog-content">
        <form>
          <v-container fluid>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  ref="projectName"
                  v-model.trim="projectName"
                  variant="underlined"
                  color="primary"
                  label="Name"
                  counter="10"
                  :error-messages="getErrorMessages(v$.projectName)"
                  @update:model-value="v$.projectName.$touch()"
                  @blur="v$.projectName.$touch()"
                />
              </v-col>
            </v-row>

            <v-row v-if="costObjectSettingEnabled">
              <v-col cols="12">
                <v-text-field
                  ref="costObject"
                  v-model="costObject"
                  variant="underlined"
                  color="primary"
                  :label="costObjectTitle"
                  :error-messages="getErrorMessages(v$.costObject)"
                  @update:model-value="v$.costObject.$touch()"
                  @blur="v$.costObject.$touch()"
                />
                <v-alert
                  v-if="!!costObjectDescriptionHtml"
                  density="compact"
                  type="info"
                  variant="tonal"
                  color="primary"
                >
                  <!-- eslint-disable vue/no-v-html -->
                  <div
                    class="alert-banner-message"
                    v-html="costObjectDescriptionHtml"
                  />
                  <!-- eslint-enable vue/no-v-html -->
                </v-alert>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-text-field
                  ref="description"
                  v-model="description"
                  variant="underlined"
                  color="primary"
                  label="Description"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  ref="purpose"
                  v-model="purpose"
                  variant="underlined"
                  color="primary"
                  label="Purpose"
                />
              </v-col>
            </v-row>
            <g-message
              v-model:message="errorMessage"
              v-model:detailed-message="detailedErrorMessage"
              color="error"
            />
          </v-container>
        </form>
        <v-snackbar
          :model-value="loading"
          location="bottom right"
          absolute
          :timeout="-1"
        >
          <span>Creating project ...</span>
        </v-snackbar>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="loading"
          @click.stop="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="text"
          :loading="loading"
          :disabled="!valid || loading"
          @click.stop="submit"
        >
          Create
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  maxLength,
  required,
} from '@vuelidate/validators'

import { useAuthnStore } from '@/store/authn'
import { useConfigStore } from '@/store/config'
import { useMemberStore } from '@/store/member'
import { useProjectStore } from '@/store/project'

import GMessage from '@/components/GMessage.vue'
import GToolbar from '@/components/GToolbar.vue'

import {
  withFieldName,
  lowerCaseAlphaNumHyphen,
  unique,
  noStartEndHyphen,
  noConsecutiveHyphen,
  withMessage,
} from '@/utils/validators'
import {
  getErrorMessages,
  setInputFocus,
  setDelayedInputFocus,
  isServiceAccountUsername,
  transformHtml,
  getProjectDetails,
} from '@/utils'
import {
  errorDetailsFromError,
  isConflict,
  isGatewayTimeout,
} from '@/utils/error'

import {
  get,
  map,
  set,
  includes,
  filter,
  isEmpty,
} from '@/lodash'

const defaultProjectName = ''

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
    project: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
    'cancel',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      projectName: undefined,
      description: undefined,
      purpose: undefined,
      owner: undefined,
      costObject: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      loading: false,
    }
  },
  validations () {
    const rules = {}
    // rules for `owner`
    const ownerRules = {
      required,
    }
    rules.owner = withFieldName('Project Owner', ownerRules)
    // rules for `costObject`
    const validCostObject = value => !this.costObjectRegex
      ? true
      : RegExp(this.costObjectRegex).test(value ?? '')
    const costObjectRules = {
      validCostObject: withMessage(() => this.costObjectErrorMessage, validCostObject),
    }
    rules.costObject = withFieldName(() => `Project ${this.costObjectTitle}`, costObjectRules)
    // rules for `projectName`
    const projectNameRules = {
      required,
      maxLength: maxLength(10),
      noConsecutiveHyphen,
      noStartEndHyphen,
      lowerCaseAlphaNumHyphen,
      unique: withMessage('A project with this name already exists', unique('projectNames')),
    }
    rules.projectName = withFieldName('Project Name', projectNameRules)

    return rules
  },
  computed: {
    ...mapState(useMemberStore, ['memberList']),
    ...mapState(useAuthnStore, ['username']),
    ...mapState(useProjectStore, ['projectNames']),
    ...mapState(useConfigStore, ['costObjectSettings']),
    visible: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
    projectDetails () {
      return getProjectDetails(this.project)
    },
    costObjectSettingEnabled () {
      return !isEmpty(this.costObjectSettings)
    },
    costObjectTitle () {
      return get(this.costObjectSettings, 'title')
    },
    costObjectDescriptionHtml () {
      const description = get(this.costObjectSettings, 'description')
      return transformHtml(description)
    },
    costObjectRegex () {
      return get(this.costObjectSettings, 'regex')
    },
    costObjectErrorMessage () {
      return get(this.costObjectSettings, 'errorMessage')
    },
    currentProjectName () {
      return this.projectDetails.projectName
    },
    currentDescription () {
      return this.projectDetails.description
    },
    currentPurpose () {
      return this.projectDetails.purpose
    },
    currentOwner () {
      return this.projectDetails.owner
    },
    currentCostObject () {
      return this.projectDetails.costObject
    },
    memberItems () {
      const members = filter(map(this.memberList, 'username'), username => !isServiceAccountUsername(username))
      const owner = this.currentOwner
      if (owner && !includes(members, owner)) {
        members.push(owner)
      }

      return members
    },
    valid () {
      return !this.v$.$invalid
    },
  },

  watch: {
    modelValue (value) {
      if (value) {
        this.reset()
      }
    },
  },
  methods: {
    ...mapActions(useProjectStore, [
      'createProject',
      'updateProject',
    ]),
    hide () {
      this.visible = false
    },
    async submit () {
      this.v$.$touch()
      if (this.valid) {
        try {
          this.loading = true
          const project = await this.save()
          this.loading = false
          this.hide()
          this.$router.push({
            name: 'Secrets',
            params: {
              namespace: project.metadata.namespace,
            },
          })
        } catch (err) {
          this.loading = false
          if (isConflict(err)) {
            this.errorMessage = `Project name '${this.projectName}' is already taken. Please try a different name.`
            setInputFocus(this, 'projectName')
          } else if (isGatewayTimeout(err)) {
            this.errorMessage = 'Project has been created but initialization is still pending.'
          } else {
            this.errorMessage = 'Failed to create project.'
          }

          const { errorCode, detailedMessage } = errorDetailsFromError(err)
          this.detailedErrorMessage = detailedMessage
          this.logger.error(this.errorMessage, errorCode, detailedMessage, err)
        }
      }
    },
    cancel () {
      this.hide()
      this.$emit('cancel')
    },
    save () {
      const name = this.projectName
      const metadata = { name }
      if (this.costObjectSettingEnabled) {
        set(metadata, ['annotations', 'billing.gardener.cloud/costObject'], this.costObject)
      }

      const description = this.description
      const purpose = this.purpose
      const data = { description, purpose }

      return this.createProject({ metadata, data })
    },
    reset () {
      this.v$.$reset()
      this.errorMessage = undefined
      this.detailedMessage = undefined

      this.projectName = defaultProjectName
      this.description = undefined
      this.purpose = undefined
      this.owner = this.username
      this.costObject = undefined

      setDelayedInputFocus(this, 'projectName')
    },
    getErrorMessages,
  },

}
</script>

<style lang="scss" scoped>
  .dialog-content {
    height: auto;
  }
</style>
