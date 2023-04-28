<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-row no-gutters>
      <v-col cols="12" md="6">
        <v-row no-gutters class="flex-column">
          <v-col class="pa-3">
            <v-card>
              <v-toolbar flat dense :color="toolbarColor">
                <v-toolbar-title class="text-subtitle-1">Details</v-toolbar-title>
              </v-toolbar>
              <v-list>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-information-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-subtitle>Name</v-list-item-subtitle>
                    <v-list-item-title>
                      {{projectName}}
                    </v-list-item-title>
                  </v-list-item-content>
                  <v-list-item-action>
                    <copy-btn color="action-button" :clipboard-text="projectName" tooltip-text="Copy project name to clipboard"></copy-btn>
                  </v-list-item-action>
                </v-list-item>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-text-subject</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-subtitle>Description</v-list-item-subtitle>
                    <v-list-item-title class="wrap-text">
                      <editable-text
                        :read-only="!canPatchProject"
                        color="action-button"
                        :value="description"
                        :save="updateDescription"
                      />
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <template v-if="staleSinceTimestamp">
                  <v-divider inset></v-divider>
                  <v-list-item>
                    <v-list-item-avatar>
                      <v-icon v-if="staleAutoDeleteTimestamp" :color="color">mdi-delete-clock</v-icon>
                      <v-icon v-else :color="color">mdi-clock-alert-outline</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                      <v-list-item-subtitle>Stale Project Information</v-list-item-subtitle>
                      <v-list-item-title class="d-flex align-center pt-1">
                        <span v-if="staleAutoDeleteTimestamp">
                          This is a <span class="font-weight-bold">stale</span> project. Gardener will auto delete this project on
                          <v-tooltip location="right">
                            <template v-slot:activator="{ on }">
                              <span class="font-weight-bold" v-on="on">{{staleAutoDeleteDate}}</span>
                            </template>
                            <time-string :date-time="staleAutoDeleteTimestamp" mode="future" no-tooltip></time-string>
                          </v-tooltip>
                        </span>
                        <span v-else>
                          This project is considered <span class="font-weight-bold">stale</span> since <time-string :date-time="staleSinceTimestamp" without-prefix-or-suffix content-class="font-weight-bold"></time-string>
                        </span>
                      </v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
                <v-divider inset/>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-account-cog-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-subtitle>Owner</v-list-item-subtitle>
                    <v-list-item-title>
                      <editable-account
                        :read-only="!canManageMembers"
                        color="action-button"
                        :value="owner"
                        :items="userList"
                        :rules="[rules.owner]"
                        placeholder="Select the owner"
                        no-data-text="No project member available"
                        :save="updateOwner"
                      ></editable-account>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <v-divider inset/>
                <v-list-item v-if="createdBy">
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-account-clock-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-subtitle>Created By</v-list-item-subtitle>
                    <v-list-item-title>
                      <account-avatar :account-name="createdBy" mail-to></account-avatar>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon v-if="!createdBy" :color="color">mdi-clock-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-subtitle>Created At</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-tooltip location="right">
                        <template v-slot:activator="{ on }">
                          <span v-on="on" class="text-subtitle-1">{{createdAt}}</span>
                        </template>
                        <time-string :date-time="creationTimestamp" :point-in-time="-1"></time-string>
                      </v-tooltip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <v-divider inset/>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-label-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-subtitle>Purpose</v-list-item-subtitle>
                    <v-list-item-title class="wrap-text">
                      <editable-text
                        :read-only="!canPatchProject"
                        color="action-button"
                        :value="purpose"
                        :save="updatePurpose"
                      />
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <template v-if="slaDescriptionHtml">
                  <v-divider inset/>
                  <v-list-item>
                    <v-list-item-avatar>
                      <v-icon :color="color">mdi-file-document-outline</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                      <v-list-item-subtitle>{{slaTitle}}</v-list-item-subtitle>
                      <v-list-item-title class="markdown wrap-text" v-html="slaDescriptionHtml"></v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
                <template v-if="shootCustomFieldList">
                  <v-divider inset/>
                  <v-list-item>
                    <v-list-item-avatar>
                      <v-icon :color="color">mdi-playlist-star</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                      <v-list-item-subtitle>Custom Fields for Shoots</v-list-item-subtitle>
                      <v-list-item-title class="d-flex flex-wrap align-center pt-1">
                        <shoot-custom-field
                          class="mr-2 mb-2"
                          v-for="{
                            key,
                            name,
                            path,
                            icon,
                            tooltip,
                            defaultValue,
                            showColumn,
                            weight,
                            columnSelectedByDefault,
                            showDetails,
                            searchable,
                            sortable
                          } in shootCustomFieldList"
                          :color="color"
                          :key="key"
                          :name="name"
                          :path="path"
                          :icon="icon"
                          :tooltip="tooltip"
                          :default-value="defaultValue"
                          :show-column="showColumn"
                          :weight="weight"
                          :column-selected-by-default="columnSelectedByDefault"
                          :show-details="showDetails"
                          :searchable="searchable"
                          :sortable="sortable"
                        ></shoot-custom-field>
                        <span v-if="!shootCustomFieldList || !shootCustomFieldList.length" class="font-weight-light text--disabled">Not defined</span>
                      </v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="12" md="6">
        <v-row no-gutters class="flex-column">
          <v-col v-if="canDeleteProject" class="pa-3">
            <v-card>
              <v-toolbar flat dense :color="toolbarColor">
                <v-toolbar-title class="text-subtitle-1">Lifecycle</v-toolbar-title>
              </v-toolbar>
              <v-list>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-delete-circle-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title>Delete Project</v-list-item-title>
                  </v-list-item-content>
                  <v-list-item-action>
                    <v-tooltip v-if="canDeleteProject" location="top">
                      <template v-slot:activator="{ on }">
                        <div v-on="on">
                          <v-btn color="action-button" :disabled="isDeleteButtonDisabled" icon @click.stop="showDialog">
                            <v-icon>mdi-delete</v-icon>
                          </v-btn>
                        </div>
                      </template>
                      <span v-text="isDeleteButtonDisabled ? 'You can only delete projects that do not contain clusters' : 'Delete Project'" />
                    </v-tooltip>
                  </v-list-item-action>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
          <v-col v-if="costObjectSettingEnabled" class="pa-3">
            <v-card>
              <v-toolbar flat dense :color="toolbarColor">
                <v-toolbar-title class="text-subtitle-1">Billing</v-toolbar-title>
              </v-toolbar>
              <v-list>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-credit-card-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-subtitle>{{costObjectTitle}}</v-list-item-subtitle>
                    <v-list-item-title>
                      <editable-text
                        :read-only="!canPatchProject"
                        color="action-button"
                        :value="costObject"
                        :rules="[rules.costObject]"
                        :save="updateCostObject"
                      >
                        <template v-if="costObjectDescriptionHtml" v-slot:info>
                          <v-alert icon="mdi-information-outline" dense text rounded="0" :color="color" class="mb-0" >
                            <div class="alertBannerMessage" v-html="costObjectDescriptionHtml"></div>
                          </v-alert>
                        </template>
                      </editable-text>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
          <v-col v-if="isKubeconfigEnabled" class="pa-3">
            <v-card>
              <v-toolbar flat dense :color="toolbarColor">
                <v-toolbar-title class="text-subtitle-1">Access</v-toolbar-title>
              </v-toolbar>
              <v-list>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-file</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title>Command Line Interface Access</v-list-item-title>
                    <v-list-item-subtitle class="wrap-text">
                      Go to
                      <router-link :to="{ name: 'Account', query: { namespace: this.namespace } }">
                        My Account
                      </router-link>
                      to download the <span class="font-family-monospace">kubeconfig</span> for this project.
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
          <v-col class="pa-3">
            <v-card>
              <v-toolbar flat dense :color="toolbarColor">
                <v-toolbar-title class="text-subtitle-1 d-flex align-center">Quota</v-toolbar-title>
                <v-spacer></v-spacer>
                <resource-quota-help></resource-quota-help>
              </v-toolbar>
              <v-skeleton-loader
                v-if="!projectQuotaStatus"
                height="400"
                type="table: table-heading, table-thead, table-tbody"
                :types="{ 'table-thead': 'heading@3', 'table-row': 'table-cell@3' }"
              ></v-skeleton-loader>
              <v-simple-table v-else-if="projectQuotaStatus.length">
                <template v-slot:default>
                  <thead>
                    <tr>
                      <th class="text-left">
                        Resource Name
                      </th>
                      <th class="text-center">
                        Used Quota
                      </th>
                      <th class="text-center">
                       Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="resourceQuota in projectQuotaStatus"
                      :key="resourceQuota.key"
                    >
                      <td>
                        <v-tooltip location="top">
                          <template v-slot:activator="{ on }">
                            <span v-on="on">{{ resourceQuota.caption }}</span>
                          </template>
                          {{ resourceQuota.resourceName }}
                        </v-tooltip>
                      </td>
                      <td class="text-center">
                        <v-tooltip location="top">
                          <template v-slot:activator="{ on }">
                            <v-progress-linear v-on="on" :model-value="resourceQuota.percentage" :color="resourceQuota.progressColor"></v-progress-linear>
                          </template>
                          {{ resourceQuota.percentage }}%
                        </v-tooltip>
                      </td>
                      <td class="text-center">{{resourceQuota.usedValue}} / {{resourceQuota.limitValue}}</td>
                    </tr>
                  </tbody>
                </template>
              </v-simple-table>
              <v-list v-else>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon :color="color">mdi-information-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title>No resource quotas defined for this project.</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <g-dialog
      v-model:error-message="errorMessage"
      v-model:detailed-error-message="detailedErrorMessage"
      ref="gDialog"
      width="600">
      <template v-slot:caption>
        Confirm Delete
      </template>
      <template v-slot:message>
        Are you sure to delete the project <span class="font-weight-bold">{{projectName}}</span>?
        <br />
        <span class="text-error font-weight-bold">The operation can not be undone.</span>
      </template>
    </g-dialog>

  </v-container>
</template>

<script>
import { mapGetters, mapState, mapActions } from 'vuex'
import CopyBtn from '@/components/CopyBtn.vue'
import EditableText from '@/components/editable/EditableText.vue'
import EditableAccount from '@/components/editable/EditableAccount.vue'
import AccountAvatar from '@/components/AccountAvatar.vue'
import GDialog from '@/components/dialogs/GDialog.vue'
import TimeString from '@/components/TimeString.vue'
import ShootCustomField from '@/components/ShootCustomField.vue'
import ResourceQuotaHelp from '@/components/ResourceQuotaHelp.vue'
import { errorDetailsFromError } from '@/utils/error'
import { transformHtml, getProjectDetails, isServiceAccountUsername, gravatarUrlGeneric, getDateFormatted } from '@/utils'
import get from 'lodash/get'
import set from 'lodash/set'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'

export default {
  name: 'administration',
  components: {
    CopyBtn,
    EditableAccount,
    EditableText,
    AccountAvatar,
    GDialog,
    TimeString,
    ShootCustomField,
    ResourceQuotaHelp
  },
  data () {
    return {
      color: 'primary',
      toolbarColor: 'toolbar-background toolbar-title--text',
      edit: false,
      editOwner: false,
      ownerMessages: [],
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      rules: {
        owner: value => {
          if (!value) {
            return 'Owner is required'
          }
          if (!includes(this.userList, value)) {
            return 'Owner must be a project member'
          }
          return true
        },
        costObject: (value = '') => {
          if (!this.costObjectRegExp) {
            return true
          }
          return this.costObjectRegExp.test(value) || this.costObjectErrorMessage
        }
      }
    }
  },
  computed: {
    ...mapState([
      'cfg',
      'namespace'
    ]),
    ...mapGetters([
      'shootList',
      'projectList',
      'memberList',
      'canPatchProject',
      'canManageMembers',
      'canDeleteProject',
      'projectFromProjectList',
      'costObjectSettings',
      'isKubeconfigEnabled',
      'shootCustomFieldList'
    ]),
    ...mapGetters('projectQuota', {
      projectQuotaStatus: 'status'
    }),
    project () {
      return this.projectFromProjectList
    },
    projectDetails () {
      return getProjectDetails(this.project)
    },
    userList () {
      const members = new Set()
      for (const { username } of this.memberList) {
        if (!isServiceAccountUsername(username)) {
          members.add(username)
        }
      }
      if (this.owner) {
        members.add(this.owner)
      }
      return Array.from(members)
    },
    costObjectSettingEnabled () {
      return !isEmpty(this.costObjectSettings)
    },
    costObjectTitle () {
      return get(this.costObjectSettings, 'title')
    },
    costObjectRegExp () {
      const pattern = get(this.costObjectSettings, 'regex')
      return pattern ? RegExp(pattern) : null
    },
    costObjectErrorMessage () {
      return get(this.costObjectSettings, 'errorMessage')
    },
    costObjectDescriptionHtml () {
      const description = get(this.costObjectSettings, 'description')
      return transformHtml(description)
    },
    projectName () {
      return this.projectDetails.projectName
    },
    owner () {
      return this.projectDetails.owner
    },
    ownerAvatarUrl () {
      return gravatarUrlGeneric(this.owner, 48)
    },
    costObject () {
      return this.projectDetails.costObject
    },
    createdAt () {
      return this.projectDetails.createdAt
    },
    creationTimestamp () {
      return this.projectDetails.creationTimestamp
    },
    createdBy () {
      return this.projectDetails.createdBy
    },
    description () {
      return this.projectDetails.description
    },
    purpose () {
      return this.projectDetails.purpose
    },
    staleSinceTimestamp () {
      return this.projectDetails.staleSinceTimestamp
    },
    staleAutoDeleteTimestamp () {
      return this.projectDetails.staleAutoDeleteTimestamp
    },
    staleAutoDeleteDate () {
      return getDateFormatted(this.staleAutoDeleteTimestamp)
    },
    isDeleteButtonDisabled () {
      return this.shootList.length > 0
    },
    sla () {
      return this.cfg.sla || {}
    },
    slaDescriptionHtml () {
      return transformHtml(this.sla.description)
    },
    slaTitle () {
      return this.sla.title
    }
  },
  methods: {
    ...mapActions([
      'patchProject',
      'deleteProject',
      'setAlert'
    ]),
    ...mapActions('projectQuota', [
      'fetchProjectQuota'
    ]),
    onEditOwner () {
      this.editOwner = !this.editOwner
      if (this.editOwner) {
        this.$nextTick(() => this.$refs.owner.activateMenu())
      }
    },
    updateOwner (value) {
      return this.updateProperty('owner', value)
    },
    updateDescription (value) {
      if (!value) {
        value = null
      }
      return this.updateProperty('description', value)
    },
    updatePurpose (value) {
      if (!value) {
        value = null
      }
      return this.updateProperty('purpose', value)
    },
    updateCostObject (value) {
      if (this.costObjectSettingEnabled) {
        if (!value) {
          value = null
        }
        return this.updateProperty('costObject', value, {
          error: 'Failed to update billing information of project'
        })
      }
    },
    async updateProperty (key, value, options = {}) {
      const { metadata: { name, namespace } } = this.project
      try {
        const mergePatchDocument = {
          metadata: { name, namespace }
        }
        switch (key) {
          case 'costObject':
            set(mergePatchDocument, ['metadata', 'annotations', 'billing.gardener.cloud/costObject'], value)
            break
          default:
            set(mergePatchDocument, ['data', key], value)
            break
        }
        // eslint-disable-next-line no-unused-vars
        const body = await this.patchProject(mergePatchDocument)
      } catch (err) {
        const { error = `Failed to update project ${key}` } = options
        throw Object.assign(new Error(error), errorDetailsFromError(err))
      }
    },
    async showDialog () {
      this.$refs.gDialog.showDialog()

      const confirmed = await this.$refs.gDialog.confirmWithDialog()
      if (confirmed) {
        try {
          await this.deleteProject(this.project)
          if (this.projectList.length > 0) {
            const p1 = this.projectList[0]
            this.$router.push({ name: 'ShootList', params: { namespace: p1.metadata.namespace } })
          } else {
            this.$router.push({ name: 'Home', params: { } })
          }
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Failed to delete project'
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
          this.showDialog()
        }
      }
    },
    reset () {
      this.errorMessage = undefined
      this.detailedMessage = undefined
      this.edit = false
    }
  },
  created () {
    // see https://router.vuejs.org/guide/advanced/data-fetching.html#fetching-after-navigation
    this.$watch(
      () => this.$route.params,
      async () => {
        try {
          await this.fetchProjectQuota(this.project.metadata.namespace)
        } catch (err) {
          this.setAlert({
            type: 'error',
            message: `Failed to fetch project quota: ${err.message}`
          })
        }
      },
      { immediate: true }
    )
  }
}
</script>

<style lang="scss" scoped>
  .markdown {
    /*  TODO: this was "::v-deep > p" before. Check if the new version below, after compile, is actually equivalent */
    :deep(> p) {
      margin: 0px;
    }
  }
  .wrap-text {
    line-height: inherit;
    overflow: auto !important;
    white-space: normal !important;
  }
</style>
