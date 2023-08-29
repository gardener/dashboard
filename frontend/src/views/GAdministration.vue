<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<!-- eslint-disable vuetify/no-deprecated-components -->
<template>
  <v-container fluid>
    <v-row no-gutters>
      <v-col
        cols="12"
        md="6"
      >
        <v-row
          no-gutters
          class="flex-column"
        >
          <v-col class="pa-3">
            <v-card>
              <g-toolbar title="Details" />
              <g-list>
                <g-list-item>
                  <template #prepend>
                    <v-icon :color="color">
                      mdi-information-outline
                    </v-icon>
                  </template>
                  <div class="text-body-2 text-medium-emphasis">
                    Name
                  </div>
                  <div class="text-body-1">
                    {{ projectName }}
                  </div>
                  <template #append>
                    <g-copy-btn
                      color="action-button"
                      :clipboard-text="projectName"
                      tooltip-text="Copy project name to clipboard"
                    />
                  </template>
                </g-list-item>
                <g-list-item>
                  <template #prepend>
                    <v-icon :color="color">
                      mdi-text-subject
                    </v-icon>
                  </template>
                  <div class="text-body-2 text-medium-emphasis">
                    Description
                  </div>
                  <div class="text-body-1 wrap-text">
                    <g-editable-text
                      :read-only="!canPatchProject"
                      color="action-button"
                      :model-value="description"
                      :save="updateDescription"
                    />
                  </div>
                </g-list-item>
                <template v-if="staleSinceTimestamp">
                  <v-divider inset />
                  <g-list-item>
                    <template #prepend>
                      <v-icon
                        v-if="staleAutoDeleteTimestamp"
                        :color="color"
                      >
                        mdi-delete-clock
                      </v-icon>
                      <v-icon
                        v-else
                        :color="color"
                      >
                        mdi-clock-alert-outline
                      </v-icon>
                    </template>
                    <div class="text-body-2 text-medium-emphasis">
                      Stale Project Information
                    </div>
                    <div class="text-body-1 d-flex align-center pt-1">
                      <span v-if="staleAutoDeleteTimestamp">
                        This is a <span class="font-weight-bold">stale</span> project. Gardener will auto delete this project on
                        <v-tooltip location="right">
                          <template #activator="{ props }">
                            <span
                              class="font-weight-bold"
                              v-bind="props"
                            >{{ staleAutoDeleteDate }}</span>
                          </template>
                          <g-time-string
                            :date-time="staleAutoDeleteTimestamp"
                            mode="future"
                            no-tooltip
                          />
                        </v-tooltip>
                      </span>
                      <span v-else>
                        This project is considered <span class="font-weight-bold">stale</span> since
                        <g-time-string
                          :date-time="staleSinceTimestamp"
                          without-prefix-or-suffix
                          content-class="font-weight-bold"
                        />
                      </span>
                    </div>
                  </g-list-item>
                </template>
                <v-divider inset />
                <g-list-item>
                  <template #prepend>
                    <v-icon :color="color">
                      mdi-account-cog-outline
                    </v-icon>
                  </template>
                  <div class="text-body-2 text-medium-emphasis">
                    Owner
                  </div>
                  <div class="text-body-1">
                    <g-editable-account
                      :read-only="!canManageMembers"
                      color="action-button"
                      :model-value="owner"
                      :items="userList"
                      :rules="ownerRules"
                      placeholder="Select the owner"
                      no-data-text="No project member available"
                      :save="updateOwner"
                    />
                  </div>
                </g-list-item>
                <v-divider inset />
                <g-list-item v-if="createdBy">
                  <template #prepend>
                    <v-icon :color="color">
                      mdi-account-clock-outline
                    </v-icon>
                  </template>
                  <div class="text-body-2 text-medium-emphasis">
                    Created By
                  </div>
                  <div class="text-body-1">
                    <g-account-avatar
                      :account-name="createdBy"
                      mail-to
                    />
                  </div>
                </g-list-item>
                <g-list-item>
                  <template #prepend>
                    <v-icon
                      v-if="!createdBy"
                      :color="color"
                    >
                      mdi-clock-outline
                    </v-icon>
                  </template>
                  <div class="text-body-2 text-medium-emphasis">
                    Created At
                  </div>
                  <div class="text-body-1">
                    <v-tooltip location="right">
                      <template #activator="{ props }">
                        <span
                          v-bind="props"
                          class="text-subtitle-1"
                        >{{ createdAt }}</span>
                      </template>
                      <g-time-string
                        :date-time="creationTimestamp"
                        :point-in-time="-1"
                      />
                    </v-tooltip>
                  </div>
                </g-list-item>
                <v-divider inset />
                <g-list-item>
                  <template #prepend>
                    <v-icon :color="color">
                      mdi-label-outline
                    </v-icon>
                  </template>
                  <div class="text-body-2 text-medium-emphasis">
                    Purpose
                  </div>
                  <div class="text-body-1 wrap-text">
                    <g-editable-text
                      :read-only="!canPatchProject"
                      color="action-button"
                      :model-value="purpose"
                      :save="updatePurpose"
                    />
                  </div>
                </g-list-item>
                <template v-if="slaDescriptionHtml">
                  <v-divider inset />
                  <g-list-item>
                    <template #prepend>
                      <v-icon :color="color">
                        mdi-file-document-outline
                      </v-icon>
                    </template>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ slaTitle }}
                    </div>
                    <!-- eslint-disable vue/no-v-html -->
                    <div
                      class="text-body-1 markdown wrap-text"
                      v-html="slaDescriptionHtml"
                    />
                    <!-- eslint-enable vue/no-v-html -->
                  </g-list-item>
                </template>
                <template v-if="shootCustomFieldList">
                  <v-divider inset />
                  <g-list-item>
                    <template #prepend>
                      <v-icon :color="color">
                        mdi-playlist-star
                      </v-icon>
                    </template>
                    <div class="text-body-2 text-medium-emphasis">
                      Custom Fields for Shoots
                    </div>
                    <div class="text-body-1 d-flex flex-wrap align-center pt-1">
                      <g-shoot-custom-field
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
                        :key="key"
                        class="mr-2 mb-2"
                        :color="color"
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
                      />
                      <span
                        v-if="!shootCustomFieldList || !shootCustomFieldList.length"
                        class="font-weight-light text-disabled"
                      >Not defined</span>
                    </div>
                  </g-list-item>
                </template>
              </g-list>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-row
          no-gutters
          class="flex-column"
        >
          <v-col
            v-if="canDeleteProject"
            class="pa-3"
          >
            <v-card>
              <g-toolbar title="Lifecycle" />
              <g-list>
                <g-list-item>
                  <template #prepend>
                    <v-icon :color="color">
                      mdi-delete-circle-outline
                    </v-icon>
                  </template>
                  <div class="text-body-1">
                    Delete Project
                  </div>
                  <template #append>
                    <v-tooltip
                      v-if="canDeleteProject"
                      location="top"
                    >
                      <template #activator="{ props }">
                        <div v-bind="props">
                          <v-btn
                            color="action-button"
                            :disabled="isDeleteButtonDisabled"
                            icon="mdi-delete"
                            variant="text"
                            size="small"
                            @click.stop="showDialog"
                          />
                        </div>
                      </template>
                      <span v-text="isDeleteButtonDisabled ? 'You can only delete projects that do not contain clusters' : 'Delete Project'" />
                    </v-tooltip>
                  </template>
                </g-list-item>
              </g-list>
            </v-card>
          </v-col>
          <v-col
            v-if="costObjectSettingEnabled"
            class="pa-3"
          >
            <v-card>
              <g-toolbar title="Billing" />
              <g-list>
                <g-list-item>
                  <template #prepend>
                    <v-icon
                      icon="mdi-credit-card-outline"
                      :color="color"
                    />
                  </template>
                  <div class="text-body-2 text-medium-emphasis">
                    Cost Object
                  </div>
                  <div class="text-body-1 wrap-text">
                    <g-editable-text
                      :read-only="!canPatchProject"
                      color="action-button"
                      :model-value="costObject"
                      :rules="costObjectRules"
                      :save="updateCostObject"
                    >
                      <template
                        v-if="costObjectDescriptionHtml"
                        #info
                      >
                        <v-alert
                          icon="mdi-information-outline"
                          density="compact"
                          variant="tonal"
                          rounded="0"
                          :color="color"
                          class="mb-0"
                        >
                          <!-- eslint-disable vue/no-v-html -->
                          <div
                            class="alertBannerMessage"
                            v-html="costObjectDescriptionHtml"
                          />
                          <!-- eslint-enable vue/no-v-html -->
                        </v-alert>
                      </template>
                    </g-editable-text>
                  </div>
                </g-list-item>
              </g-list>
            </v-card>
          </v-col>
          <v-col
            v-if="isKubeconfigEnabled"
            class="pa-3"
          >
            <v-card>
              <g-toolbar title="Access" />
              <g-list>
                <g-list-item>
                  <template #prepend>
                    <v-icon :color="color">
                      mdi-file
                    </v-icon>
                  </template>
                  <div class="text-body-1">
                    Command Line Interface Access
                  </div>
                  <div class="text-body-2 text-medium-emphasis">
                    Go to
                    <router-link
                      :to="{ name: 'Account', query: { namespace: namespace } }"
                      class="text-anchor"
                    >
                      My Account
                    </router-link>
                    to download the <span class="font-family-monospace">kubeconfig</span> for this project.
                  </div>
                </g-list-item>
              </g-list>
            </v-card>
          </v-col>
          <v-col class="pa-3">
            <v-card>
              <g-toolbar title="Quota">
                <template #append>
                  <g-resource-quota-help />
                </template>
              </g-toolbar>
              <v-skeleton-loader
                v-if="!projectQuotaStatus"
                height="400"
                type="table: table-heading, table-thead, table-tbody"
                :types="{ 'table-thead': 'heading@3', 'table-row': 'table-cell@3' }"
              />
              <v-table v-else-if="projectQuotaStatus.length">
                <template #default>
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
                          <template #activator="{ props }">
                            <span v-bind="props">{{ resourceQuota.caption }}</span>
                          </template>
                          {{ resourceQuota.resourceName }}
                        </v-tooltip>
                      </td>
                      <td class="text-center">
                        <v-tooltip location="top">
                          <template #activator="{ props }">
                            <v-progress-linear
                              v-bind="props"
                              :model-value="resourceQuota.percentage"
                              :color="resourceQuota.progressColor"
                            />
                          </template>
                          {{ resourceQuota.percentage }}%
                        </v-tooltip>
                      </td>
                      <td class="text-center">
                        {{ resourceQuota.usedValue }} / {{ resourceQuota.limitValue }}
                      </td>
                    </tr>
                  </tbody>
                </template>
              </v-table>
              <g-list v-else>
                <g-list-item>
                  <template #prepend>
                    <v-icon :color="color">
                      mdi-information-outline
                    </v-icon>
                  </template>
                  <div class="text-body-2">
                    No resource quotas defined for this project.
                  </div>
                </g-list-item>
              </g-list>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <g-dialog
      ref="gDialog"
      v-model:error-message="errorMessage"
      v-model:detailed-error-message="detailedErrorMessage"
      width="600"
    >
      <template #caption>
        Confirm Delete
      </template>
      <template #message>
        Are you sure to delete the project <span class="font-weight-bold">{{ projectName }}</span>?
        <br>
        <span class="text-error font-weight-bold">The operation can not be undone.</span>
      </template>
    </g-dialog>
  </v-container>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'
import {
  required,
  helpers,
} from '@vuelidate/validators'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useQuotaStore } from '@/store/quota'
import { useKubeconfigStore } from '@/store/kubeconfig'
import { useProjectStore } from '@/store/project'
import { useShootStore } from '@/store/shoot'
import { useMemberStore } from '@/store/member'

import GList from '@/components/GList.vue'
import GListItem from '@/components/GListItem.vue'
import GToolbar from '@/components/GToolbar.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GEditableText from '@/components/editable/GEditableText.vue'
import GEditableAccount from '@/components/editable/GEditableAccount.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GDialog from '@/components/dialogs/GDialog.vue'
import GTimeString from '@/components/GTimeString.vue'
import GShootCustomField from '@/components/GShootCustomField.vue'
import GResourceQuotaHelp from '@/components/GResourceQuotaHelp.vue'

import {
  transformHtml,
  getProjectDetails,
  isServiceAccountUsername,
  gravatarUrlGeneric,
  getDateFormatted,
} from '@/utils'
import { errorDetailsFromError } from '@/utils/error'

import {
  get,
  set,
  includes,
  isEmpty,
} from '@/lodash'

export default {
  components: {
    GList,
    GListItem,
    GToolbar,
    GCopyBtn,
    GEditableAccount,
    GEditableText,
    GAccountAvatar,
    GDialog,
    GTimeString,
    GShootCustomField,
    GResourceQuotaHelp,
  },
  inject: ['logger'],
  data () {
    return {
      color: 'primary',
      edit: false,
      editOwner: false,
      ownerMessages: [],
      errorMessage: undefined,
      detailedErrorMessage: undefined,
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'sla',
      'costObjectSettings',
    ]),
    ...mapState(useAuthzStore, [
      'namespace',
      'canPatchProject',
      'canManageMembers',
      'canDeleteProject',
    ]),
    ...mapState(useKubeconfigStore, [
      'isKubeconfigEnabled',
    ]),
    ...mapState(useProjectStore, [
      'projectList',
      'project',
      'shootCustomFieldList',
    ]),
    ...mapState(useMemberStore, [
      'memberList',
    ]),
    ...mapState(useShootStore, [
      'shootList',
    ]),
    ...mapState(useQuotaStore, [
      'projectQuotaStatus',
    ]),
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
    costObjectDescriptionHtml () {
      const description = get(this.costObjectSettings, 'description')
      return transformHtml(description)
    },
    costObjectRules () {
      return {
        costObject: this.getCostObjectValidator(),
      }
    },
    projectName () {
      return this.projectDetails.projectName
    },
    owner () {
      return this.projectDetails.owner
    },
    ownerRules () {
      const userListIncludesValidator = helpers.withParams(
        { type: 'userListIncludes' },
        value => {
          return includes(this.userList, value)
        },
      )
      return {
        required: helpers.withMessage('Owner is required', required),
        userListIncludes: helpers.withMessage('Owner must be a project member', userListIncludesValidator),
      }
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
    slaDescriptionHtml () {
      return transformHtml(this.sla.description)
    },
    slaTitle () {
      return this.sla.title
    },
  },
  created () {
    // see https://router.vuejs.org/guide/advanced/data-fetching.html#fetching-after-navigation
    this.$watch(
      () => this.$route.params,
      async () => {
        try {
          await this.fetchQuotas(this.project.metadata.namespace)
        } catch (err) {
          this.setAlert({
            type: 'error',
            message: `Failed to fetch project quota: ${err.message}`,
          })
        }
      },
      { immediate: true },
    )
  },
  methods: {
    ...mapActions(useAppStore, [
      'setAlert',
    ]),
    ...mapActions(useProjectStore, [
      'patchProject',
      'deleteProject',
    ]),
    ...mapActions(useQuotaStore, [
      'fetchQuotas',
    ]),
    getCostObjectValidator () {
      const pattern = get(this.costObjectSettings, 'regex', '[^]*')
      return helpers.withMessage(
        () => get(this.costObjectSettings, 'errorMessage'),
        helpers.regex(new RegExp(pattern)),
      )
    },
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
          error: 'Failed to update billing information of project',
        })
      }
    },
    async updateProperty (key, value, options = {}) {
      const { metadata: { name, namespace } } = this.project
      try {
        const mergePatchDocument = {
          metadata: { name, namespace },
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
          this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
          this.showDialog()
        }
      }
    },
    reset () {
      this.errorMessage = undefined
      this.detailedMessage = undefined
      this.edit = false
    },
  },
}
</script>

<style lang="scss" scoped>
  .markdown {
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
