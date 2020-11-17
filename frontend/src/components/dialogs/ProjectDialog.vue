<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" persistent scrollable max-width="600">
    <v-card>
      <v-card-title class="dialog-title white--text align-center justify-start">
        <v-icon large dark>mdi-cube</v-icon>
        <span class="headline ml-5">Create Project</span>
      </v-card-title>
      <v-card-text class="dialog-content">
        <form>
          <v-container fluid >
            <v-row >
              <v-col cols="12">
                <v-text-field
                  :color="color"
                  ref="projectName"
                  label="Name"
                  v-model.trim="projectName"
                  :error-messages="getFieldValidationErrors('projectName')"
                  @input="$v.projectName.$touch()"
                  @blur="$v.projectName.$touch()"
                  counter="10"
                  ></v-text-field>
              </v-col>
            </v-row>

            <v-row v-if="costObjectSettingEnabled">
              <v-col cols="12">
                <v-text-field
                  :color="color"
                  ref="costObject"
                  :label="costObjectTitle"
                  v-model="costObject"
                  :error-messages="getFieldValidationErrors('costObject')"
                  @input="$v.costObject.$touch()"
                  @blur="$v.costObject.$touch()"
                  >
                </v-text-field>
                <v-alert v-if="!!costObjectDescriptionHtml" dense type="info" outlined :color="color">
                  <div class="alertBannerMessage" v-html="costObjectDescriptionHtml"></div>
                </v-alert>
              </v-col>
            </v-row>

            <v-row >
              <v-col cols="12">
                <v-text-field
                  :color="color"
                  ref="description"
                  label="Description"
                  v-model="description"
                  ></v-text-field>
              </v-col>
            </v-row>
            <v-row >
              <v-col cols="12">
                <v-text-field
                  :color="color"
                  label="Purpose"
                  v-model="purpose"
                  ></v-text-field>
              </v-col>
            </v-row>
            <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
          </v-container>
        </form>
        <v-snackbar :value="loading" bottom right absolute :timeout="-1">
          <span>Creating project ...</span>
        </v-snackbar>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          text
          :disabled="loading"
          @click.stop="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          text
          :loading="loading"
          :disabled="!valid || loading"
          @click.stop="submit"
          :color="color"
        >
          Create
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'
import { maxLength, required } from 'vuelidate/lib/validators'
import { resourceName, unique, noStartEndHyphen, noConsecutiveHyphen } from '@/utils/validators'
import { getValidationErrors, setInputFocus, setDelayedInputFocus, isServiceAccountUsername, transformHtml, getProjectDetails } from '@/utils'
import { errorDetailsFromError, isConflict, isGatewayTimeout } from '@/utils/error'
import get from 'lodash/get'
import map from 'lodash/map'
import set from 'lodash/set'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import GAlert from '@/components/GAlert'

const defaultProjectName = ''

export default {
  name: 'project-dialog',
  components: {
    GAlert
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    project: {
      type: Object
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
      color: 'blue-grey darken-2'
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    ...mapGetters([
      'memberList',
      'username',
      'projectNamesFromProjectList',
      'costObjectSettings'
    ]),
    ...mapState([
      'cfg'
    ]),
    visible: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    projectNames () {
      return this.projectNamesFromProjectList
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
      return !this.$v.$invalid
    },
    validators () {
      const validators = {
        owner: {
          required
        },
        costObject: {
          validCostObject: value => {
            if (!this.costObjectRegex) {
              return true
            }
            return RegExp(this.costObjectRegex).test(value || '') // undefined cannot be evaluated, use empty string as default
          }
        }
      }
      validators.projectName = {
        required,
        maxLength: maxLength(10),
        noConsecutiveHyphen,
        noStartEndHyphen, // Order is important for UI hints
        resourceName,
        unique: unique('projectNames')
      }
      return validators
    },
    validationErrors () {
      return {
        projectName: {
          required: 'Name is required',
          maxLength: 'Name exceeds the maximum length',
          resourceName: 'Name must only be lowercase letters, numbers, and hyphens',
          unique: 'Name is already in use',
          noConsecutiveHyphen: 'Name must not contain consecutive hyphens',
          noStartEndHyphen: 'Name must not start or end with a hyphen'
        },
        owner: {
          required: 'Owner is required'
        },
        costObject: {
          validCostObject: this.costObjectErrorMessage
        }
      }
    }
  },
  methods: {
    ...mapActions([
      'createProject',
      'updateProject'
    ]),
    getFieldValidationErrors (field) {
      return getValidationErrors(this, field)
    },
    hide () {
      this.visible = false
    },
    async submit () {
      this.$v.$touch()
      if (this.valid) {
        try {
          this.loading = true
          const project = await this.save()
          this.loading = false
          this.hide()
          this.$router.push({
            name: 'Secrets',
            params: {
              namespace: project.metadata.namespace
            }
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
          console.error(this.errorMessage, errorCode, detailedMessage, err)
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
      this.$v.$reset()
      this.errorMessage = undefined
      this.detailedMessage = undefined

      this.projectName = defaultProjectName
      this.description = undefined
      this.purpose = undefined
      this.owner = this.username
      this.costObject = undefined

      setDelayedInputFocus(this, 'projectName')
    }
  },
  watch: {
    value (value) {
      if (value) {
        this.reset()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .dialog-title {
    background-size: cover;
    height: 130px;
    background-image: url('../../assets/project_background.svg');
  }
  .dialog-content {
    height: auto;
  }
</style>
