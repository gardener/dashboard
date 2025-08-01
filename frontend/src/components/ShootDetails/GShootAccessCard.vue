<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list key="accessCardList">
    <g-list-item v-if="!isAnyTileVisible">
      <template #prepend>
        <v-icon
          color="primary"
          icon="mdi-alert-circle-outline"
        />
      </template>
      <g-list-item-content>
        Access information currently not available
      </g-list-item-content>
    </g-list-item>

    <g-terminal-list-tile
      v-if="isTerminalTileVisible"
      target="shoot"
      :description="shootTerminalDescription"
      :button-description="shootTerminalButtonDescription"
      :disabled="shootTerminalButtonDisabled"
    />

    <v-divider
      v-if="isTerminalTileVisible && (isTerminalShortcutsTileVisible || isDashboardTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />

    <g-terminal-shortcuts-tile
      v-if="isTerminalShortcutsTileVisible"
      popper-boundaries-selector="#accessCardList"
      @add-terminal-shortcut="onAddTerminalShortcut"
    />

    <v-divider
      v-if="isTerminalShortcutsTileVisible && (isDashboardTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />

    <template v-if="isDashboardTileVisible">
      <g-list-item>
        <template #prepend>
          <v-icon
            color="primary"
            icon="mdi-developer-board"
          />
        </template>
        <g-list-item-content>
          Dashboard
          <template #description>
            Access Dashboard using the kubectl command-line tool by running the following command:
            <code>kubectl proxy</code>.
            Kubectl will make Dashboard available at:
            <span
              v-if="isShootStatusHibernated"
              v-tooltip:top="'Dashboard is not running for hibernated clusters'"
              class="text-grey"
            >{{ dashboardUrl }}</span>
            <a
              v-else
              class="text-anchor"
              :href="dashboardUrl"
              target="_blank"
              rel="noopener"
            >
              {{ dashboardUrl }}
            </a>
          </template>
        </g-list-item-content>
      </g-list-item>
    </template>

    <v-divider
      v-if="isDashboardTileVisible && (isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />
    <template v-if="isKubeconfigTileVisible">
      <g-shoot-kubeconfig show-list-icon />
      <g-shoot-admin-kubeconfig />
    </template>

    <v-divider
      v-if="isKubeconfigTileVisible && isGardenctlTileVisible"
      inset
    />

    <g-gardenctl-commands
      v-if="isGardenctlTileVisible"
    />
  </g-list>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useTerminalStore } from '@/store/terminal'

import GList from '@/components/GList.vue'
import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GTerminalListTile from '@/components/GTerminalListTile.vue'

import { useShootAdminKubeconfig } from '@/composables/useShootAdminKubeconfig'
import {
  useShootItem,
  useProvideShootItem,
} from '@/composables/useShootItem'

import GGardenctlCommands from './GGardenctlCommands.vue'
import GShootKubeconfig from './GShootKubeconfig.vue'
import GShootAdminKubeconfig from './GShootAdminKubeconfig.vue'
import GTerminalShortcutsTile from './GTerminalShortcutsTile.vue'

import isEmpty from 'lodash/isEmpty'
import get from 'lodash/get'

const props = defineProps({
  selectedShoot: {
    type: Object,
  },
  hideTerminalShortcuts: {
    type: Boolean,
    default: false,
  },
})

const {
  selectedShoot,
  hideTerminalShortcuts,
} = toRefs(props)

const emit = defineEmits([
  'addTerminalShortcut',
])

const authnStore = useAuthnStore()
const {
  isAdmin,
} = storeToRefs(authnStore)
const authzStore = useAuthzStore()
const {
  hasShootTerminalAccess,
  canCreateShootsAdminkubeconfig,
  canCreateShootsViewerkubeconfig,
  hasControlPlaneTerminalAccess,
} = storeToRefs(authzStore)
const terminalStore = useTerminalStore()
const {
  isTerminalShortcutsFeatureEnabled,
} = storeToRefs(terminalStore)

const {
  isEnabled: isShootAdminKubeconfigEnabled,
} = useShootAdminKubeconfig()
const {
  shootItem,
  isShootStatusHibernated,
  hasShootWorkerGroups,
  shootInfo,
  isSeedUnreachable,
} = selectedShoot.value
  ? useProvideShootItem(selectedShoot)
  : useShootItem()

const dashboardUrl = computed(() => {
  if (!hasDashboardEnabled.value) {
    return ''
  }

  if (!shootInfo.value.dashboardUrlPath) {
    return ''
  }
  const pathname = shootInfo.value.dashboardUrlPath
  return `http://localhost:8001${pathname}`
})

const hasDashboardEnabled = computed(() => {
  return get(shootItem.value, ['spec', 'addons', 'kubernetesDashboard', 'enabled'], false) === true
})

const kubeconfigGardenlogin = computed(() => {
  return shootInfo.value?.kubeconfigGardenlogin
})

const shootTerminalButtonDisabled = computed(() => {
  return !isAdmin.value && isShootStatusHibernated.value
})

const shootTerminalButtonDescription = computed(() => {
  if (shootTerminalButtonDisabled.value) {
    return 'Cluster is hibernated. Wake up cluster to open terminal.'
  }
  return shootTerminalDescription.value
})

const shootTerminalDescription = computed(() => {
  return hasControlPlaneTerminalAccess.value ? 'Open terminal into cluster or cluster\'s control plane' : 'Open terminal into cluster'
})

const isAnyTileVisible = computed(() => {
  return isDashboardTileVisible.value || isKubeconfigTileVisible.value || isTerminalTileVisible.value || isGardenctlTileVisible.value
})

const isDashboardTileVisible = computed(() => {
  return !!dashboardUrl.value
})

const isKubeconfigTileVisible = computed(() => {
  return !!kubeconfigGardenlogin.value || (isShootAdminKubeconfigEnabled.value && canCreateShootsAdminkubeconfig.value)
})

const isGardenctlTileVisible = computed(() => {
  return canCreateShootsViewerkubeconfig.value || canCreateShootsAdminkubeconfig.value
})

const isTerminalTileVisible = computed(() => {
  return !isEmpty(shootItem.value) && hasShootTerminalAccess.value && !isSeedUnreachable.value && (hasShootWorkerGroups.value || isAdmin.value)
})

const isTerminalShortcutsTileVisible = computed(() => {
  return isTerminalTileVisible.value && !hideTerminalShortcuts.value && isTerminalShortcutsFeatureEnabled.value
})

function onAddTerminalShortcut (shortcut) {
  emit('addTerminalShortcut', shortcut)
}
</script>

<style lang="scss" scoped>
  .scroll {
    overflow-x: auto;
  }

  .wrap-text {
    line-height: inherit;
    overflow: auto !important;
    white-space: normal !important;
    code {
      box-shadow: none !important;
      padding: 1px;
      color: black;
    }
  }
</style>
