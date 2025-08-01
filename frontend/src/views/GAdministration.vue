<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

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
                    <span>
                      <span>Name</span>
                      <v-tooltip
                        activator="parent"
                        location="top"
                        text="Technical, unique project name."
                      />
                    </span>
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
                    <span>
                      <span>Title</span>
                      <v-tooltip
                        activator="parent"
                        location="top"
                        text="Human-readable project title."
                      />
                    </span>
                  </div>
                  <div class="text-body-1 wrap-text">
                    <g-editable-text
                      :read-only="!canPatchProject"
                      color="action-button"
                      :model-value="projectTitle"
                      :save="updateProjectTitle"
                      :rules="projectTitleRules"
                      :counter="true"
                      :max-length="64"
                    />
                  </div>
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
                    <g-time-string
                      :date-time="creationTimestamp"
                      :point-in-time="-1"
                    />
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
                      } in shootCustomFields"
                      :key="name"
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
                      v-if="!shootCustomFields?.length"
                      class="font-weight-light text-disabled"
                    >Not defined</span>
                  </div>
                  <template #append>
                    <g-shoot-custom-fields-configuration />
                  </template>
                </g-list-item>
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
                    <div
                      v-tooltip:top="
                        isDeleteButtonDisabled ?
                          'You can only delete projects that do not contain clusters' :
                          'Delete Project'"
                    >
                      <v-btn
                        v-if="canDeleteProject"
                        color="action-button"
                        :disabled="isDeleteButtonDisabled"
                        icon="mdi-delete"
                        variant="text"
                        size="small"
                        @click.stop="showDialog"
                      />
                    </div>
                  </template>
                </g-list-item>
              </g-list>
            </v-card>
          </v-col>
          <v-col
            v-if="costObjectsSettingEnabled"
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
                    {{ costObjectTitle || "Cost Object" }}
                  </div>
                  <div
                    v-if="costObject"
                    class="text-body-1 wrap-text"
                  >
                    {{ costObject }}
                  </div>
                  <span
                    v-else
                    class="font-weight-light text-disabled"
                  >Not defined</span>
                  <template #append>
                    <g-project-cost-object-configuration />
                  </template>
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
                    <g-text-router-link
                      :to="{ name: 'Account', query: { namespace } }"
                      text="My Account"
                    />
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
                      <td class="text-left">
                        <span
                          v-tooltip:top="resourceQuota.resourceName"
                        >
                          {{ resourceQuota.caption }}
                        </span>
                      </td>
                      <td class="text-center">
                        <div>
                          <v-progress-linear
                            v-tooltip:top="`${resourceQuota.percentage}%`"
                            :model-value="resourceQuota.percentage"
                            :color="resourceQuota.progressColor"
                            :height="8"
                          />
                        </div>
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
      ref="refGDialog"
      v-model:error-message="errorMessage"
      v-model:detailed-error-message="detailedErrorMessage"
      width="600"
    >
      <template #caption>
        Confirm Delete
      </template>
      <template #content>
        <v-card-text>
          Are you sure to delete the project <span class="font-weight-bold">{{ projectName }}</span>?
          <br>
          <span class="text-error font-weight-bold">The operation can not be undone.</span>
        </v-card-text>
      </template>
    </g-dialog>
  </v-container>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  toRef,
} from 'vue'
import { storeToRefs } from 'pinia'
import {
  useRoute,
  useRouter,
} from 'vue-router'
import {
  required,
  helpers,
} from '@vuelidate/validators'

import { useAppStore } from '@/store/app'
import { useConfigStore } from '@/store/config'
import { useQuotaStore } from '@/store/quota'
import { useProjectStore } from '@/store/project'
import { useShootStore } from '@/store/shoot'
import { useMemberStore } from '@/store/member'
import { useAuthzStore } from '@/store/authz'
import { useKubeconfigStore } from '@/store/kubeconfig'

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
import GProjectCostObjectConfiguration from '@/components/GProjectCostObjectConfiguration.vue'
import GShootCustomFieldsConfiguration from '@/components/GShootCustomFieldsConfiguration.vue'
import GResourceQuotaHelp from '@/components/GResourceQuotaHelp.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'

import { useProvideProjectItem } from '@/composables/useProjectItem'
import { useProvideProjectContext } from '@/composables/useProjectContext'
import { useLogger } from '@/composables/useLogger'

import { withMessage } from '@/utils/validators'
import {
  transformHtml,
  isServiceAccountUsername,
  getDateFormatted,
} from '@/utils'
import { errorDetailsFromError } from '@/utils/error'
import { annotations } from '@/utils/annotations.js'
import { projectTitleRules } from '@/utils/project.js'

import includes from 'lodash/includes'
import set from 'lodash/set'

const logger = useLogger()
const appStore = useAppStore()
const configStore = useConfigStore()
const quotaStore = useQuotaStore()
const projectStore = useProjectStore()
const shootStore = useShootStore()
const memberStore = useMemberStore()
const authzStore = useAuthzStore()
const kubeconfigStore = useKubeconfigStore()

const route = useRoute()
const router = useRouter()

useProvideProjectContext()

const color = ref('primary')
const errorMessage = ref(undefined)
const detailedErrorMessage = ref(undefined)
const refGDialog = ref(null)

const {
  project,
  projectsNotMarkedForDeletion,
} = storeToRefs(projectStore)
const {
  projectName,
  projectTitle,
  shootCustomFields,
  projectOwner: owner,
  projectCreationTimestamp: creationTimestamp,
  projectCreatedBy: createdBy,
  projectDescription: description,
  projectPurpose: purpose,
  projectStaleSinceTimestamp: staleSinceTimestamp,
  projectStaleAutoDeleteTimestamp: staleAutoDeleteTimestamp,
  costObject,
  costObjectsSettingEnabled,
  costObjectTitle,
} = useProvideProjectItem(project)

const {
  namespace,
  canPatchProject,
  canManageMembers,
  canDeleteProject,
} = storeToRefs(authzStore)
const isKubeconfigEnabled = toRef(kubeconfigStore, 'isKubeconfigEnabled')
const projectQuotaStatus = toRef(quotaStore, 'projectQuotaStatus')

const userList = computed(() => {
  const members = new Set()
  for (const { username } of memberStore.memberList) {
    if (!isServiceAccountUsername(username)) {
      members.add(username)
    }
  }
  if (owner.value) {
    members.add(owner.value)
  }
  return Array.from(members)
})

const ownerRules = computed(() => {
  const userListIncludesValidator = helpers.withParams(
    { type: 'userListIncludes' },
    value => includes(userList.value, value),
  )
  return {
    required: withMessage('Owner is required', required),
    userListIncludes: withMessage('Owner must be a project member', userListIncludesValidator),
  }
})

const staleAutoDeleteDate = computed(() => getDateFormatted(staleAutoDeleteTimestamp.value))
const isDeleteButtonDisabled = computed(() => shootStore.shootList.length > 0)
const slaDescriptionHtml = computed(() => transformHtml(configStore.sla.description))
const slaTitle = computed(() => configStore.sla.title)

watch(
  () => route.params,
  async () => {
    try {
      await quotaStore.fetchQuotas(namespace.value)
    } catch (err) {
      appStore.setError(`Failed to fetch project quota: ${err.message}`)
    }
  },
  { immediate: true },
)

function updateOwner (name) {
  const owner = {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'User',
    name,
  }
  return updateProperty(['spec', 'owner'], owner)
}

function updateProjectTitle (value) {
  return updateProperty(['metadata', 'annotations', annotations.projectTitle], value || null)
}

function updateDescription (value) {
  return updateProperty(['spec', 'description'], value)
}

function updatePurpose (value) {
  return updateProperty(['spec', 'purpose'], value)
}

async function updateProperty (path, value, options = {}) {
  const { metadata: { name }, spec: { namespace } } = projectStore.project
  try {
    const mergePatchDocument = {
      metadata: { name },
      spec: { namespace },
    }
    set(mergePatchDocument, path, value)
    await projectStore.patchProject(mergePatchDocument)
  } catch (err) {
    const { error = `Failed to update project ${path.join('.')}` } = options
    throw Object.assign(new Error(error), errorDetailsFromError(err))
  }
}

async function showDialog () {
  refGDialog.value.showDialog()

  const confirmed = await refGDialog.value.confirmWithDialog()
  if (confirmed) {
    try {
      await projectStore.deleteProject(projectStore.project)
      if (projectsNotMarkedForDeletion.value.length > 0) {
        const p1 = projectsNotMarkedForDeletion.value[0]
        router.push({ name: 'ShootList', params: { namespace: p1.spec.namespace } })
      } else {
        router.push({ name: 'Home', params: {} })
      }
    } catch (err) {
      const errorDetails = errorDetailsFromError(err)
      errorMessage.value = 'Failed to delete project'
      detailedErrorMessage.value = errorDetails.detailedMessage
      logger.error(errorMessage.value, errorDetails.errorCode, errorDetails.detailedMessage, err)
      showDialog()
    }
  }
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
