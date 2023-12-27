<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template #prepend>
      <v-icon
        :icon="icon"
        color="primary"
      />
    </template>
    <g-list-item-content v-if="isGardenloginType">
      Kubeconfig - Gardenlogin
      <template #description>
        <span
          v-if="isKubeconfigAvailable"
          class="wrap-text"
        >
          Does not contain credentials
          (requires <span class="font-family-monospace">gardenlogin</span> kubectl plugin)
        </span>
        <span v-else>
          Gardenlogin kubeconfig currently not available
        </span>
      </template>
    </g-list-item-content>
    <g-list-item-content v-if="isStaticKubeconfigType">
      Kubeconfig - Static Token
      <template #description>
        <span v-if="!shootEnableStaticTokenKubeconfig">
          Static token kubeconfig is disabled for this cluster
        </span>
        <span v-else-if="!isKubeconfigAvailable">
          Static token kubeconfig currently not available
        </span>
        <span
          v-else
          class="wrap-text"
        >
          Contains static token credential.
          Not recommended, consider disabling the static token kubeconfig
        </span>
      </template>
    </g-list-item-content>
    <g-list-item-content v-if="isAdminKubeconfigType">
      Admin Kubeconfig
      <div class="text-body-2 d-flex">
        <span>
          Request a kubeconfig valid for
        </span>
        <g-popover
          toolbar-title="Configure Admin Kubeconfig Lifetime"
          placement="bottom"
        >
          <template #activator="{ props }">
            <v-chip
              label
              size="x-small"
              color="primary"
              variant="outlined"
              class="ml-2 pointer"
              v-bind="props"
            >
              {{ adminKubeConfigExpirationTitle }}
            </v-chip>
          </template>
          <div class="pa-2">
            You can configure the <span class="font-weight-bold">kubeconfig lifetime</span> on the
            <router-link
              :to="{ name: 'Settings', params: { name: shootName, namespace: shootNamespace } }"
              class="text-anchor"
            >
              <span>Settings</span>
            </router-link>
            page.
          </div>
        </g-popover>
      </div>
    </g-list-item-content>
    <template #append>
      <g-gardenlogin-info v-if="isGardenloginType" />
      <template v-if="isKubeconfigAvailable || isAdminKubeconfigType">
        <g-action-button
          icon="mdi-download"
          tooltip="Download Kubeconfig"
          @click.stop="onDownload"
        />
        <g-copy-btn
          :clipboard-text="getCopyKubeConfigText"
        />
        <g-action-button
          :icon="kubeconfigVisibilityIcon"
          :tooltip="kubeconfigVisibilityTitle"
          @click.stop="toggleKubeconfig"
        />
      </template>

      <g-static-token-kubeconfig-configuration
        v-if="isStaticKubeconfigType"
        :shoot-item="shootItem"
      />
    </template>
  </g-list-item>
  <g-list-item
    v-if="kubeconfigExpansionPanel"
    key="expansion-gardenlogin-kubeconfig"
  >
    <g-list-item-content>
      <g-code-block
        lang="yaml"
        :content="kubeconfig"
        :show-copy-button="false"
      />
    </g-list-item-content>
  </g-list-item>
</template>

<script>
import download from 'downloadjs'
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GGardenloginInfo from '@/components/GGardenloginInfo.vue'
import GStaticTokenKubeconfigConfiguration from '@/components/GStaticTokenKubeconfigConfiguration.vue'

import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

import { find } from '@/lodash'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GCopyBtn,
    GCodeBlock,
    GGardenloginInfo,
    GStaticTokenKubeconfigConfiguration,
  },
  mixins: [shootItem],
  inject: ['api', 'logger'],
  props: {
    showListIcon: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'gardenlogin',
    },
  },
  data () {
    return {
      kubeconfigExpansionPanel: false,
      adminKubeconfig: undefined,
    }
  },
  computed: {
    ...mapState(useConfigStore, ['shootAdminKubeconfigExpirations']),
    ...mapState(useLocalStorageStore, ['shootAdminKubeconfigExpiration']),
    icon () {
      return this.showListIcon ? 'mdi-file' : ''
    },
    kubeconfig () {
      if (this.isGardenloginType) {
        return this.shootInfo?.kubeconfigGardenlogin
      }

      if (this.isStaticKubeconfigType) {
        return this.shootInfo?.kubeconfig
      }

      return this.adminKubeconfig
    },
    isKubeconfigAvailable () {
      return !!this.kubeconfig
    },
    kubeconfigVisibilityIcon () {
      return this.kubeconfigExpansionPanel ? 'mdi-eye-off' : 'mdi-eye'
    },
    kubeconfigVisibilityTitle () {
      return this.kubeconfigExpansionPanel ? 'Hide Kubeconfig' : 'Show Kubeconfig'
    },
    isGardenloginType () {
      return this.type === 'gardenlogin'
    },
    isStaticKubeconfigType () {
      return this.type === 'token'
    },
    isAdminKubeconfigType () {
      return this.type === 'adminkubeconfig'
    },
    getQualifiedName () {
      const prefix = this.isGardenloginType ? 'kubeconfig-gardenlogin' : 'kubeconfig'
      return `${prefix}--${this.shootProjectName}--${this.shootName}.yaml`
    },
    adminKubeConfigExpirationTitle () {
      return this.shootAdminKubeconfigExpirations.map(({ value }) => value).includes(this.shootAdminKubeconfigExpiration)
        ? find(this.shootAdminKubeconfigExpirations, ['value', this.shootAdminKubeconfigExpiration]).title
        : '600s'
    },
  },
  watch: {
    kubeconfig (value) {
      this.reset()
    },
  },
  methods: {
    async createAdminKubeconfig () {
      try {
        const resp = await this.api.createShootAdminKubeconfig({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            expirationSeconds: this.shootAdminKubeconfigExpiration,
          },
        })

        this.adminKubeconfig = resp.data
      } catch (err) {
        const errorMessage = 'Could not request admin kubeconfig'
        const errorDetails = errorDetailsFromError(err)
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async toggleKubeconfig () {
      if (!this.kubeconfigExpansionPanel && this.isAdminKubeconfigType) {
        await this.createAdminKubeconfig()
      }

      this.kubeconfigExpansionPanel = !this.kubeconfigExpansionPanel
    },
    async getCopyKubeConfigText () {
      if (this.isAdminKubeconfigType) {
        await this.createAdminKubeconfig()
      }
      return this.kubeconfig
    },
    reset () {
      this.kubeconfigExpansionPanel = false
    },
    async onDownload () {
      if (this.isAdminKubeconfigType) {
        await this.createAdminKubeconfig()
      }

      const kubeconfig = this.kubeconfig
      if (kubeconfig) {
        download(kubeconfig, this.getQualifiedName, 'text/yaml')
      }
    },
  },
}
</script>
