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
      <div class="text-body-2">
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
      </div>
    </g-list-item-content>
    <g-list-item-content v-if="isStaticKubeconfigType">
      Kubeconfig - Static Token
      <div class="text-body-2">
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
      </div>
    </g-list-item-content>
    <g-list-item-content v-if="isAdminKubeconfigType">
      Admin Kubeconfig
      <div class="text-body-2">
        <span>
          Request a kubeconfig valid for {{adminKubeConfigExpiration}}
        </span>
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
        <g-copy-btn v-if="!isAdminKubeconfigType" :clipboard-text="kubeconfig" />
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
      <g-admin-kube-config-request
        v-if="isAdminKubeconfigType"
        :expirations="possibleAdminKubeconfigExpirationSettings"
        :shootItem="shootItem"
        @update:expiration="onExpirationUpdate"
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

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GGardenloginInfo from '@/components/GGardenloginInfo.vue'
import GStaticTokenKubeconfigConfiguration from '@/components/GStaticTokenKubeconfigConfiguration.vue'
import GAdminKubeConfigRequest from '@/components/GAdminKubeConfigRequest'
import { filter } from '@/lodash'
import { useConfigStore } from '@/store/config'
import {
  mapState,
} from 'pinia'
import { errorDetailsFromError } from '@/utils/error'


import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GCopyBtn,
    GCodeBlock,
    GGardenloginInfo,
    GStaticTokenKubeconfigConfiguration,
    GAdminKubeConfigRequest
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
      adminKubeConfigExpiration: '30m', // Default 30 minutes
      adminKubeconfig: undefined
    }
  },
  computed: {
    ...mapState(useConfigStore, ['shootAdminKubeconfig']),
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
    possibleAdminKubeconfigExpirationSettings () {
      let expirations = ['30m', '1h', '3h', '6h', '12h', '1d', '3d', '7d']

      if (this.shootAdminKubeconfig?.maxExpirationSeconds) {
        expirations = filter(expirations, expiration => {
          return this.adminKubeConfigExpirationInSeconds(expiration) <= this.shootAdminKubeconfig.maxExpirationSeconds
        })
      }

      return expirations
    },
    getQualifiedName () {
      const prefix = this.isGardenloginType ? 'kubeconfig-gardenlogin' : 'kubeconfig'
      return `${prefix}--${this.shootProjectName}--${this.shootName}.yaml`
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
            expirationSeconds: this.adminKubeConfigExpirationInSeconds(this.adminKubeConfigExpiration)
          }
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
    async onExpirationUpdate (kubeconfigExpiration) {
      if (this.adminKubeConfigExpiration !== kubeconfigExpiration) {
        this.adminKubeconfig = undefined
      }

      this.adminKubeConfigExpiration = kubeconfigExpiration
    },
    adminKubeConfigExpirationInSeconds (durationAsString) {
      const units = { d: 86400, h: 3600, m: 60 }
      const regex = /(\d+)([dhm])/g
      const match = regex.exec(durationAsString)
      const seconds = parseInt(match[1]) * units[match[2]]

      return seconds
  }
  }
}
</script>
