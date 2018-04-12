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

<template>
  <v-dialog v-model="visible" max-width="600" persistent>
    <v-card class="project">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-cube</v-icon>
        <span v-if="isCreateMode">Create new Project</span>
        <span v-else>Update Project</span>
      </v-card-title>
      <v-card-text>
        <form>
          <v-container fluid>
            <template v-if="isCreateMode">
              <v-layout row>
                <v-flex xs5>
                  <v-text-field
                    color="deep-purple"
                    xs5
                    ref="projectName"
                    label="Name"
                    v-model="projectName"
                    :error-messages="getFieldValidationErrors('projectName')"
                    @input="$v.projectName.$touch()"
                    @blur="$v.projectName.$touch()"
                    required
                    counter="10"
                    tabindex="1"
                    ></v-text-field>
                </v-flex>
              </v-layout>
            </template>
            <template v-else>
              <v-layout row>
                <v-flex xs5>
                  <div class="title pb-3">{{projectName}}</div>
                </v-flex>
              </v-layout>
              <v-layout row>
                <v-flex xs5>
                  <v-select
                    color="deep-purple"
                    :items="memberList"
                    label="Main Contact"
                    v-model="owner"
                    tabindex="1"
                    ></v-select>
                </v-flex>
              </v-layout>
            </template>
            <v-layout row>
              <v-flex xs12>
                <v-text-field
                  color="deep-purple"
                  ref="description"
                  label="Description"
                  v-model="description"
                  :error-messages="getFieldValidationErrors('description')"
                  @input="$v.description.$touch()"
                  @blur="$v.description.$touch()"
                  counter="50"
                  tabindex="2"
                  ></v-text-field>
              </v-flex>
            </v-layout>
            <v-layout row>
              <v-flex xs12>
                <v-text-field
                  color="deep-purple"
                  label="Purpose"
                  v-model="purpose"
                  tabindex="3"
                  ></v-text-field>
              </v-flex>
            </v-layout>
            <v-alert color="error" dismissible v-model="alertVisible">{{errorMessage}}</v-alert>
          </v-container>
        </form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.stop="cancel" tabindex="5">Cancel</v-btn>
        <v-btn flat @click.stop="submit" :disabled="!valid" tabindex="4" class="deep-purple--text">{{submitButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import { mapActions, mapGetters } from 'vuex'
  import { required, maxLength } from 'vuelidate/lib/validators'
  import { resourceName, unique } from '@/utils/validators'
  import { getValidationErrors, setInputFocus } from '@/utils'
  import { isConflict } from '@/utils/error'
  import map from 'lodash/map'
  import cloneDeep from 'lodash/cloneDeep'

  const defaultProjectName = 'my-project'

  const validationErrors = {
    description: {
      maxLength: 'Description exceeds the maximum length'
    },
    projectName: {
      required: 'Name is required',
      maxLength: 'Name exceeds the maximum length',
      resourceName: 'Name must only be lowercase letters, numbers, and hyphens',
      unique: 'Name is already in use'
    }
  }

  export default {
    name: 'project-dialog',
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
        errorMessage: undefined,
        validationErrors
      }
    },
    validations () {
      // had to move the code to a computed property so that the getValidationErrors method can access it
      return this.validators
    },
    computed: {
      ...mapGetters([
        'projectList',
        'memberList'
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
        const iteratee = item => item.metadata.name
        return map(this.projectList, iteratee)
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
      validators () {
        const validators = {
          description: {
            maxLength: maxLength(50)
          }
        }
        if (this.isCreateMode) {
          validators.projectName = {
            required,
            resourceName,
            maxLength: maxLength(10),
            unique: unique('projectNames')
          }
        }
        return validators
      },
      alertVisible: {
        get () {
          return !!this.errorMessage
        },
        set (value) {
          if (!value) {
            this.errorMessage = undefined
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
      submit () {
        this.$v.$touch()
        if (this.valid) {
          this.save()
            .then(project => {
              this.hide()
              this.$emit('submit', project)
              if (this.isCreateMode) {
                this.$router.push({name: 'Secrets', params: { namespace: project.metadata.namespace }})
              }
            })
            .catch(err => {
              if (isConflict(err)) {
                if (this.isCreateMode) {
                  this.errorMessage = 'Project name is already taken. Please try a different name.'
                  setInputFocus(this, 'projectName')
                } else {
                  this.errorMessage = 'Conflict. Failed to update project.'
                }
              } else {
                this.errorMessage = err.message
              }
            })
        }
      },
      cancel () {
        this.hide()
        this.$emit('cancel')
      },
      save () {
        if (this.isCreateMode) {
          const name = this.projectName
          const metadata = {name}

          const description = this.description
          const purpose = this.purpose
          const data = {description, purpose}

          return this.createProject({metadata, data})
        } else {
          const project = cloneDeep(this.project)

          project.data.description = this.description
          project.data.purpose = this.purpose
          project.data.owner = this.owner

          return this.updateProject(project)
        }
      },
      reset () {
        this.$v.$reset()
        this.errorMessage = undefined

        if (this.isCreateMode) {
          this.projectName = defaultProjectName
          this.description = undefined
          this.purpose = undefined
          setInputFocus(this, 'projectName')
        } else {
          const metadata = this.project ? this.project.metadata || {} : {}
          const projectData = this.project ? this.project.data || {} : {}

          this.projectName = metadata ? metadata.name || '' : ''
          this.description = projectData.description
          this.purpose = projectData.purpose
          this.owner = projectData.owner
          setInputFocus(this, 'description')
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
    }
  }
</script>

<style lang="styl">
  .project {
    .card__title{
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
