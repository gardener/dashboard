<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container
    fluid
    class="px-6"
  >
    <v-row>
      <v-col
        cols="12"
        md="6"
      >
        <v-card class="mt-4">
          <g-toolbar title="Global" />
          <g-list>
            <g-list-item>
              <template #prepend>
                <v-icon color="primary">
                  mdi-theme-light-dark
                </v-icon>
              </template>
              <g-list-item-content label="Color Scheme">
                <v-btn-toggle
                  v-model="colorScheme"
                  color="primary"
                  mandatory="force"
                  divided
                  density="compact"
                  class="mt-1"
                >
                  <v-btn
                    v-tooltip:top="'Light Mode'"
                    value="light"
                    variant="tonal"
                    min-width="36"
                  >
                    <v-icon icon="mdi-white-balance-sunny" />
                  </v-btn>
                  <v-btn
                    v-tooltip:top="'Dark Mode'"
                    value="dark"
                    variant="tonal"
                    min-width="36"
                  >
                    <v-icon icon="mdi-weather-night" />
                  </v-btn>
                  <v-btn
                    v-tooltip:top="'Automatically choose theme based on your system settings'"
                    value="auto"
                    variant="tonal"
                    min-width="36"
                  >
                    <v-icon icon="mdi-brightness-auto" />
                  </v-btn>
                </v-btn-toggle>
              </g-list-item-content>
            </g-list-item>
            <v-divider inset />
            <g-list-item>
              <template #prepend>
                <v-icon color="primary">
                  mdi-bug
                </v-icon>
              </template>
              <g-list-item-content label="Log Level">
                <v-btn-toggle
                  v-model="logLevel"
                  color="primary"
                  mandatory="force"
                  divided
                  density="compact"
                  class="mt-1"
                >
                  <v-btn
                    v-for="{ value, text, icon, color } in logLevels"
                    :key="value"
                    v-tooltip:top="text"
                    :value="value"
                    variant="tonal"
                    min-width="36"
                  >
                    <v-icon
                      :icon="icon"
                      :color="color"
                    />
                  </v-btn>
                </v-btn-toggle>
              </g-list-item-content>
            </g-list-item>
            <v-divider inset />
            <g-list-item>
              <template #prepend>
                <v-icon color="primary">
                  mdi-login
                </v-icon>
              </template>
              <g-list-item-content
                label="Automatic Login"
                description="Skip the login screen if no user input is required"
              />
              <template #append>
                <v-switch
                  v-model="autoLogin"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </template>
            </g-list-item>
            <template v-if="isShootAdminKubeconfigEnabled">
              <v-divider inset />
              <g-list-item>
                <template #prepend>
                  <v-icon color="primary">
                    mdi-file-key-outline
                  </v-icon>
                </template>
                <g-list-item-content label="Cluster Time-Limited Kubeconfig Lifetime">
                  <v-select
                    v-model="shootAdminKubeconfigExpiration"
                    :items="shootAdminKubeconfigExpirationItems"
                    variant="solo-filled"
                    density="compact"
                    flat
                    single-line
                    hide-details
                    class="mt-1"
                    style="max-width: 200px;"
                  />
                </g-list-item-content>
              </g-list-item>
            </template>
          </g-list>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-card class="mt-4 cluster-list-card">
          <g-toolbar
            title="Cluster List"
            data-test="cluster-list-settings-title"
          />
          <g-list>
            <g-list-item>
              <template #prepend>
                <v-icon color="primary">
                  mdi-cog-outline
                </v-icon>
              </template>
              <g-list-item-content
                label="Operator Features"
                description="Show the Issue Since column and Focus mode in project cluster lists to help identify and triage clusters with issues"
              />
              <template #append>
                <v-switch
                  v-model="operatorFeatures"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </template>
            </g-list-item>
            <v-divider inset />
            <g-list-item
              ref="defaultClusterViewSettingsItem"
              class="default-view"
              :class="{ 'default-view--highlighted': highlightDefaultClusterViewSettings }"
              tabindex="-1"
              @focusout="clearDefaultClusterViewHighlight"
              @keydown="clearDefaultClusterViewHighlight"
              @pointerdown="clearDefaultClusterViewHighlight"
            >
              <template #prepend>
                <v-icon color="primary">
                  mdi-view-dashboard-outline
                </v-icon>
              </template>
              <g-list-item-content label="Default Cluster View">
                <template #description>
                  Choose whether the All Projects cluster list opens with all clusters or Operations View.
                  <template v-if="authzStore.canViewLandscape">
                    This also determines which unhealthy Shoots are counted for each Seed.
                  </template>
                </template>
              </g-list-item-content>
              <template #append>
                <v-btn-toggle
                  v-model="defaultClusterView"
                  color="primary"
                  mandatory="force"
                  divided
                  density="compact"
                  class="default-view-toggle"
                  aria-label="Default cluster view"
                >
                  <v-btn
                    value="all"
                    variant="tonal"
                  >
                    All clusters
                  </v-btn>
                  <v-btn
                    value="operations"
                    variant="tonal"
                  >
                    Operations View
                  </v-btn>
                </v-btn-toggle>
              </template>
            </g-list-item>
            <v-divider inset />
            <g-list-item
              ref="clusterOperationsSettingsItem"
              class="operations-view"
              :class="{ 'operations-view--highlighted': highlightClusterOperationsSettings }"
              tabindex="-1"
            >
              <template #prepend>
                <v-icon color="primary">
                  mdi-filter-outline
                </v-icon>
              </template>
              <g-list-item-content label="Operations View">
                <template #description>
                  <div
                    data-test="operations-view-description"
                  >
                    {{ operationsViewDescription }}
                  </div>
                </template>
              </g-list-item-content>
              <template #append>
                <v-btn
                  v-if="authzStore.canViewLandscape"
                  v-tooltip:top="'Configure exclusion criteria'"
                  icon="mdi-cog-outline"
                  variant="text"
                  aria-label="Configure exclusion criteria"
                  @click="allProjectsDialog = true"
                />
              </template>
            </g-list-item>
          </g-list>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog
      v-if="authzStore.canViewLandscape"
      v-model="allProjectsDialog"
      max-width="640"
      scrollable
      persistent
      aria-labelledby="cluster-operations-dialog-title"
      @after-enter="focusClusterOperationsDialogTitle"
      @after-leave="onClusterOperationsDialogClosed"
    >
      <v-card>
        <g-toolbar
          prepend-icon="mdi-filter-cog-outline"
          size="large"
        >
          <span
            id="cluster-operations-dialog-title"
            ref="clusterOperationsDialogTitle"
            tabindex="-1"
          >
            Operations View
          </span>
        </g-toolbar>
        <v-card-text class="pa-0">
          <div class="px-6 pt-5 text-body-medium text-medium-emphasis">
            Operations View shows clusters that may need attention.
          </div>
          <div class="px-6 pt-5">
            <div
              id="cluster-operations-exclusion-title"
              class="text-title-large mb-1"
            >
              Exclusion criteria
            </div>
            <div
              v-if="authzStore.canViewLandscape"
              class="text-body-medium text-medium-emphasis"
            >
              Choose which clusters to hide.
            </div>
          </div>
          <g-list class="py-0">
            <div class="criteria mx-6 my-4">
              <g-list-item class="criterion px-4 py-3">
                <g-list-item-content>
                  <div>Hide healthy clusters</div>
                  <template #description>
                    Always excluded.
                  </template>
                </g-list-item-content>
                <template #append>
                  <span
                    v-tooltip:top="'Healthy clusters are always hidden in Operations View'"
                    class="d-inline-flex"
                  >
                    <v-switch
                      :model-value="true"
                      color="primary"
                      density="compact"
                      hide-details
                      disabled
                      aria-label="Hide healthy clusters"
                    />
                  </span>
                </template>
              </g-list-item>
              <template v-if="authzStore.canViewLandscape">
                <v-divider />
                <g-list-item class="criterion px-4 py-3">
                  <g-list-item-content>
                    <div>Hide progressing clusters</div>
                    <template #description>
                      Clusters with a health issue still within its grace period, or in an expected transient state such as creation, deletion, or a rollout.
                    </template>
                  </g-list-item-content>
                  <template #append>
                    <v-switch
                      v-model="hideProgressing"
                      color="primary"
                      density="compact"
                      hide-details
                      aria-label="Hide progressing clusters"
                    />
                  </template>
                </g-list-item>
                <v-divider />
                <g-list-item class="criterion px-4 py-3">
                  <g-list-item-content>
                    <div>Hide clusters without operator action needed</div>
                    <template #description>
                      <div>
                        Clusters with user-caused issues, automatically retried infrastructure issues such as rate limits, or this annotation:
                      </div>
                      <div class="annotation font-family-monospace mt-1">
                        dashboard.gardener.cloud/ignore-issues
                      </div>
                    </template>
                  </g-list-item-content>
                  <template #append>
                    <v-switch
                      v-model="hideOperatorAction"
                      color="primary"
                      density="compact"
                      hide-details
                      aria-label="Hide clusters without operator action needed"
                    />
                  </template>
                </g-list-item>
                <template v-if="showAllTicketsIgnoredFilter">
                  <v-divider />
                  <g-list-item class="criterion px-4 py-3">
                    <g-list-item-content>
                      <div>Hide clusters with only ignored tickets</div>
                      <template #description>
                        <div>
                          A ticket is considered ignored if it has any of the labels below. Clusters without tickets remain visible.
                        </div>
                        <v-btn
                          variant="text"
                          density="compact"
                          size="small"
                          color="primary"
                          class="label-toggle px-0 mt-1"
                          :append-icon="showIgnoredTicketLabels ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                          :aria-expanded="showIgnoredTicketLabels"
                          @click.stop="showIgnoredTicketLabels = !showIgnoredTicketLabels"
                        >
                          {{ ignoredTicketLabelToggleText }}
                        </v-btn>
                      </template>
                    </g-list-item-content>
                    <template #append>
                      <v-switch
                        v-model="allTicketsIgnored"
                        color="primary"
                        density="compact"
                        hide-details
                        aria-label="Hide clusters with only ignored tickets"
                      />
                    </template>
                  </g-list-item>
                  <v-expand-transition>
                    <div
                      v-if="showIgnoredTicketLabels"
                      class="ticket-labels d-flex flex-wrap ga-1 mx-4 mb-3 pa-2"
                      aria-label="Configured ignored ticket labels"
                    >
                      <v-chip
                        v-for="label in ignoredTicketLabels"
                        :key="label"
                        label
                        size="small"
                        variant="tonal"
                      >
                        {{ label }}
                      </v-chip>
                    </div>
                  </v-expand-transition>
                </template>
              </template>
            </div>
          </g-list>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-6">
          <v-spacer />
          <v-btn
            color="primary"
            variant="text"
            aria-label="OK"
            @click="allProjectsDialog = false"
          >
            OK
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  toRef,
  watch,
} from 'vue'
import { useUrlSearchParams } from '@vueuse/core'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import { useShootAdminKubeconfig } from '@/composables/useShootAdminKubeconfig'
import {
  getEnabledOperationsViewExclusionReasons,
  useShootListFilters,
} from '@/composables/useShootListFilters'

const localStorageStore = useLocalStorageStore()
const allProjectsDialog = ref(false)
const showIgnoredTicketLabels = ref(false)
const defaultClusterViewSettingsItem = ref()
const clusterOperationsSettingsItem = ref()
const clusterOperationsDialogTitle = ref()
const highlightDefaultClusterViewSettings = ref(false)
const highlightClusterOperationsSettings = ref(false)
const settingsHashParams = useUrlSearchParams('hash-params')
const deepLinkedSetting = toRef(settingsHashParams, 'setting')
let clusterOperationsDeepLinkActive = false
let clusterOperationsHighlightTimer
const shootAdminKubeconfig = useShootAdminKubeconfig()
const {
  expirations: shootAdminKubeconfigExpirations,
  isEnabled: isShootAdminKubeconfigEnabled,
  expiration: shootAdminKubeconfigExpiration,
  humanizeExpiration,
} = shootAdminKubeconfig

const authzStore = useAuthzStore()
const configStore = useConfigStore()

const {
  operationsViewFilters,
  defaultClusterView,
  setHideProgressing,
  setHideWithoutOperatorAction,
  setHideAllTicketsIgnored,
} = useShootListFilters()

const hideProgressing = computed({
  get: () => operationsViewFilters.value.progressing ?? false,
  set: setHideProgressing,
})

const hideOperatorAction = computed({
  get: () => operationsViewFilters.value.operatorAction ?? false,
  set: setHideWithoutOperatorAction,
})

const allTicketsIgnored = computed({
  get: () => operationsViewFilters.value.allTicketsIgnored ?? false,
  set: setHideAllTicketsIgnored,
})

const ignoredTicketLabels = computed(() => configStore.ticket?.hideClustersWithLabels ?? [])

const ignoredTicketLabelToggleText = computed(() => {
  const count = ignoredTicketLabels.value.length
  const action = showIgnoredTicketLabels.value ? 'Hide' : 'Show'
  return `${action} ${count} ignored ${count === 1 ? 'label' : 'labels'}`
})

const showAllTicketsIgnoredFilter = computed(() => {
  return configStore.ticket?.gitHubRepoUrl && ignoredTicketLabels.value.length > 0
})

const operationsViewFilterReasonFormatter = new Intl.ListFormat('en', {
  style: 'long',
  type: 'disjunction',
})

const operationsViewDescription = computed(() => {
  const reasons = getEnabledOperationsViewExclusionReasons({
    ...operationsViewFilters.value,
    allTicketsIgnored: showAllTicketsIgnoredFilter.value && operationsViewFilters.value.allTicketsIgnored,
  })
  const description = 'Shows unhealthy clusters that may need attention'
  if (!reasons.length) {
    return `${description}.`
  }

  return `${description}, excluding those that ${operationsViewFilterReasonFormatter.format(reasons)}.`
})

function defaultClusterViewSettingsElement () {
  return defaultClusterViewSettingsItem.value?.$el ?? defaultClusterViewSettingsItem.value
}

function clusterOperationsSettingsElement () {
  return clusterOperationsSettingsItem.value?.$el ?? clusterOperationsSettingsItem.value
}

function clearDefaultClusterViewHighlight () {
  highlightDefaultClusterViewSettings.value = false
}

function highlightDefaultClusterViewEntry () {
  const element = defaultClusterViewSettingsElement()
  highlightDefaultClusterViewSettings.value = true
  element?.scrollIntoView?.({
    behavior: 'smooth',
    block: 'center',
  })
  const focusTarget = element?.querySelector('button') ?? element
  focusTarget?.focus?.({ preventScroll: true })
}

function highlightClusterOperationsEntry () {
  const element = clusterOperationsSettingsElement()
  highlightClusterOperationsSettings.value = true
  element?.scrollIntoView?.({
    behavior: 'smooth',
    block: 'center',
  })
  const focusTarget = element?.querySelector('button') ?? element
  focusTarget?.focus?.({ preventScroll: true })

  clearTimeout(clusterOperationsHighlightTimer)
  clusterOperationsHighlightTimer = setTimeout(() => {
    highlightClusterOperationsSettings.value = false
  }, 3000)
}

function focusClusterOperationsDialogTitle () {
  clusterOperationsDialogTitle.value?.focus({ preventScroll: true })
}

async function onClusterOperationsDialogClosed () {
  if (!clusterOperationsDeepLinkActive) {
    return
  }

  clusterOperationsDeepLinkActive = false
  deepLinkedSetting.value = null
  await nextTick()
  highlightClusterOperationsEntry()
}

watch(deepLinkedSetting, async value => {
  if (value === 'default-cluster-view') {
    deepLinkedSetting.value = null
    await nextTick()
    highlightDefaultClusterViewEntry()
    return
  }

  if (value !== 'cluster-operations') {
    return
  }

  if (!authzStore.canViewLandscape) {
    deepLinkedSetting.value = null
    return
  }

  clusterOperationsDeepLinkActive = true
  allProjectsDialog.value = true
}, {
  immediate: true,
})

onBeforeUnmount(() => {
  clearTimeout(clusterOperationsHighlightTimer)
})

const logLevels = [
  { value: 'debug', text: 'Verbose', icon: 'mdi-bug', color: 'grey darken-4' },
  { value: 'info', text: 'Info', icon: 'mdi-information', color: 'blue darken-2' },
  { value: 'warn', text: 'Warning', icon: 'mdi-alert', color: 'warning' },
  { value: 'error', text: 'Error', icon: 'mdi-close-circle', color: 'error' },
  { value: 'silent', text: 'Silent', icon: 'mdi-pause-octagon', color: 'grey' },
]

const {
  logLevel,
  autoLogin,
  colorScheme,
  operatorFeatures,
} = storeToRefs(localStorageStore)

const shootAdminKubeconfigExpirationItems = computed(() => {
  return shootAdminKubeconfigExpirations.value.map(value => {
    return {
      value,
      title: humanizeExpiration(value),
    }
  })
})
</script>

<style lang="scss" scoped>
.cluster-list-card {
  container-type: inline-size;
}

.default-view,
.operations-view {
  transition: background-color 0.5s ease;
}

.default-view--highlighted,
.operations-view--highlighted {
  background-color: rgb(var(--v-theme-accent));
}

:deep(.criterion .g-list-item__prepend) {
  display: none;
}

.criteria {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.ticket-labels {
  max-height: 160px;
  overflow-y: auto;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.annotation {
  width: fit-content;
  max-width: 100%;
  padding: 2px 6px;
  overflow-wrap: anywhere;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.label-toggle {
  letter-spacing: normal;
  text-transform: none;
}

@container (max-width: 720px) {
  .default-view {
    display: grid !important;
    grid-template-columns: 40px minmax(0, 1fr);
    column-gap: 16px;
  }

  .default-view :deep(.g-list-item__prepend) {
    grid-column: 1;
    grid-row: 1;
    margin-right: 0 !important;
  }

  .default-view :deep(.g-list-item__content) {
    grid-column: 2;
    grid-row: 1;
  }

  .default-view :deep(.g-list-item__append) {
    grid-column: 2;
    grid-row: 2;
    width: 100%;
    margin: 12px 0 0 !important;
  }

  .default-view-toggle {
    width: 100%;
    max-width: 420px;
  }

  .default-view-toggle :deep(.v-btn) {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
