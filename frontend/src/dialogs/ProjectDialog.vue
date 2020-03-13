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

<template>
  <v-dialog v-model="visible" persistent scrollable max-width="600px">
    <v-card class="project">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-cube</v-icon>
        <span v-if="isCreateMode">Create Project</span>
        <span v-else>Update Project</span>
      </v-card-title>
      <v-card-text>
        <form>
          <v-container fluid grid-list-xl>
            <template v-if="isCreateMode">
              <v-layout row>
                <v-flex xs6>
                  <v-text-field
                    color="deep-purple"
                    ref="projectName"
                    label="Name"
                    v-model.trim="projectName"
                    :error-messages="getFieldValidationErrors('projectName')"
                    @input="$v.projectName.$touch()"
                    @blur="$v.projectName.$touch()"
                    counter="10"
                    ></v-text-field>
                </v-flex>
              </v-layout>
            </template>
            <template v-else>
              <v-layout row>
                <v-flex xs6>
                  <div class="title pb-3">{{projectName}}</div>
                </v-flex>
              </v-layout>
              <v-layout row>
               <v-flex xs6>
                 <v-select
                   color="deep-purple"
                   :items="memberItems"
                   label="Technical Contact"
                   v-model="technicalContact"
                   ></v-select>
               </v-flex>
           </v-layout>
            </template>

            <v-layout row v-if="costObjectSettingEnabled">
              <v-flex xs6>
                <v-text-field
                  color="deep-purple"
                  ref="costObject"
                  :label="costObjectTitle"
                  v-model="costObject"
                  :error-messages="getFieldValidationErrors('costObject')"
                  @input="$v.costObject.$touch()"
                  @blur="$v.costObject.$touch()"
                  >
                </v-text-field>
              </v-flex>

            </v-layout>
            <v-layout row v-if="!!costObjectDescriptionCompiledMarkdown">
              <v-alert :value="true" dense type="info" outline color="deep-purple">
                <div class="alertBannerMessage" v-html="costObjectDescriptionCompiledMarkdown"></div>
              </v-alert>
            </v-layout>

            <v-layout row>
              <v-flex xs12>
                <v-text-field
                  color="deep-purple"
                  ref="description"
                  label="Description"
                  v-model="description"
                  ></v-text-field>
              </v-flex>
            </v-layout>
            <v-layout row>
              <v-flex xs12>
                <v-text-field
                  color="deep-purple"
                  label="Purpose"
                  v-model="purpose"
                  ></v-text-field>
              </v-flex>
            </v-layout>
            <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
          </v-container>
        </form>
        <v-snackbar :value="loading" bottom right absolute :timeout="0">
          <span>{{snackbarText}}</span>
        </v-snackbar>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          flat
          :disabled="loading"
          @click.stop="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          flat
          :loading="loading"
          :disabled="!valid || loading"
          @click.stop="submit"
          class="deep-purple--text"
        >
          {{submitButtonText}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'
import { maxLength, required } from 'vuelidate/lib/validators'
import { resourceName, unique, noStartEndHyphen, noConsecutiveHyphen } from '@/utils/validators'
import { getValidationErrors, setInputFocus, isServiceAccount, compileMarkdown, getProjectDetails } from '@/utils'
import { errorDetailsFromError, isConflict, isGatewayTimeout } from '@/utils/error'
import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import map from 'lodash/map'
import set from 'lodash/set'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
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
      technicalContact: undefined,
      costObject: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      loading: false
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
      return this.costObjectSettings !== undefined
    },
    costObjectTitle () {
      return get(this.costObjectSettings, 'title')
    },
    costObjectDescriptionCompiledMarkdown () {
      const description = get(this.costObjectSettings, 'description')
      return compileMarkdown(description)
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
    currentTechnicalContact () {
      return this.projectDetails.technicalContact
    },
    currentCostObject () {
      return this.projectDetails.costObject
    },
    memberItems () {
      const members = filter(map(this.memberList, 'username'), username => !isServiceAccount(username))
      const technicalContact = this.currentTechnicalContact
      if (technicalContact && !includes(members, technicalContact)) {
        members.push(technicalContact)
      }

      return members
    },
    valid () {
      return !this.$v.$invalid
    },
    isCreateMode () {
      return !this.project
    },
    submitButtonText () {
      return this.isCreateMode ? 'Create' : 'Save'
    },
    snackbarText () {
      return this.isCreateMode ? 'Creating project ...' : 'Updating project ...'
    },
    validators () {
      const validators = {
        technicalContact: {
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
      if (this.isCreateMode) {
        validators.projectName = {
          required,
          maxLength: maxLength(10),
          noConsecutiveHyphen,
          noStartEndHyphen, // Order is important for UI hints
          resourceName,
          unique: unique('projectNames')
        }
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
        technicalContact: {
          required: 'Technical Contact is required'
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
          if (this.isCreateMode) {
            this.$router.push({
              name: 'Secrets',
              params: {
                namespace: project.metadata.namespace
              }
            })
          }
        } catch (err) {
          this.loading = false
          if (this.isCreateMode) {
            if (isConflict(err)) {
              this.errorMessage = `Project name '${this.projectName}' is already taken. Please try a different name.`
              setInputFocus(this, 'projectName')
            } else if (isGatewayTimeout(err)) {
              this.errorMessage = 'Project has been created but initialization is still pending.'
            } else {
              this.errorMessage = 'Failed to create project.'
            }
          } else {
            this.errorMessage = 'Failed to update project.'
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
      if (this.isCreateMode) {
        const name = this.projectName
        const metadata = { name }
        if (this.costObjectSettingEnabled) {
          set(metadata, ['annotations', 'billing.gardener.cloud/costObject'], this.costObject)
        }

        const description = this.description
        const purpose = this.purpose
        const data = { description, purpose }

        return this.createProject({ metadata, data })
      } else {
        const project = cloneDeep(this.project)

        project.data.description = this.description
        project.data.purpose = this.purpose
        project.data.owner = this.technicalContact
        if (this.costObjectSettingEnabled) {
          set(project.metadata, ['annotations', 'billing.gardener.cloud/costObject'], this.costObject)
        }

        return this.updateProject(project)
      }
    },
    reset () {
      this.$v.$reset()
      this.errorMessage = undefined
      this.detailedMessage = undefined

      if (this.isCreateMode) {
        this.projectName = defaultProjectName
        this.description = undefined
        this.purpose = undefined
        this.technicalContact = this.username
        this.costObject = undefined

        setInputFocus(this, 'projectName')
      } else {
        this.projectName = this.currentProjectName
        this.description = this.currentDescription
        this.purpose = this.currentPurpose
        this.technicalContact = this.currentTechnicalContact
        if (this.costObjectSettingEnabled) {
          this.costObject = this.currentCostObject
        }
      }
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

<style lang="styl">
  .project {
    .v-card__title{
      background-image: url(../assets/project_background.svg);
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
