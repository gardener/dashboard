<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-list-item>
      <v-list-item-icon>
        <v-icon color="primary">{{icon}}</v-icon>
      </v-list-item-icon>
      <v-list-item-content v-if="isGardenloginType">
        <v-list-item-title>Kubeconfig - Gardenlogin</v-list-item-title>
        <v-list-item-subtitle v-if="isKubeconfigAvailable" class="wrap-text">Does not contain credentials (requires <span class="font-family-monospace">gardenlogin</span> kubectl plugin)</v-list-item-subtitle>
        <v-list-item-subtitle v-else>Gardenlogin kubeconfig currently not available</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-content v-if="isStaticKubeconfigType">
        <v-list-item-title>Kubeconfig - Static Token</v-list-item-title>
        <v-list-item-subtitle v-if="!shootEnableStaticTokenKubeconfig">Static token kubeconfig is disabled for this cluster</v-list-item-subtitle>
        <v-list-item-subtitle v-else-if="!isKubeconfigAvailable">Static token kubeconfig currently not available</v-list-item-subtitle>
        <v-list-item-subtitle class="wrap-text" v-else>Contains static token credential. Not recommended, consider disabling the static token kubeconfig</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-content v-if="isAdminKubeconfigType">
        <v-list-item-title>Admin Kubeconfig</v-list-item-title>
        <v-list-item-subtitle>Request a kubeconfig valid for {{adminKubeConfigExpiration}}</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action v-if="isGardenloginType" class="mx-0">
        <gardenlogin-info></gardenlogin-info>
      </v-list-item-action>
      <v-list-item-action class="mx-0" v-if="isKubeconfigAvailable || isAdminKubeconfigType">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="onDownload" color="action-button">
              <v-icon>mdi-download</v-icon>
            </v-btn>
          </template>
          <span>Download Kubeconfig</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action class="mx-0" v-if="isKubeconfigAvailable && !isAdminKubeconfigType">
        <copy-btn :clipboard-text="kubeconfig"></copy-btn>
      </v-list-item-action>
      <v-list-item-action class="mx-0" v-if="isKubeconfigAvailable || isAdminKubeconfigType">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="toggleKubeconfig" color="action-button">
              <v-icon>{{kubeconfigVisibilityIcon}}</v-icon>
            </v-btn>
          </template>
          <span>{{kubeconfigVisibilityTitle}}</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="isStaticKubeconfigType" class="mx-0">
        <static-token-kubeconfig-configuration :shootItem="shootItem"></static-token-kubeconfig-configuration>
      </v-list-item-action>
      <v-list-item-action v-if="isAdminKubeconfigType" class="mx-0">
        <admin-kube-config-request :expirations="possibleAdminKubeconfigExpirationSettings" :shootItem="shootItem" @expirationUpdate="onExpirationUpdate"></admin-kube-config-request>
      </v-list-item-action>
    </v-list-item>
    <v-list-item v-if="kubeconfigExpansionPanel" key="expansion-gardenlogin-kubeconfig">
      <v-list-item-icon></v-list-item-icon>
      <v-list-item-content class="pt-0">
        <code-block lang="yaml" :content="kubeconfig" :show-copy-button="false"></code-block>
      </v-list-item-content>
    </v-list-item>
  </div>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import GardenloginInfo from '@/components/GardenloginInfo.vue'
import StaticTokenKubeconfigConfiguration from '@/components/StaticTokenKubeconfigConfiguration'
import AdminKubeConfigRequest from '@/components/AdminKubeConfigRequest'
import download from 'downloadjs'
import { shootItem } from '@/mixins/shootItem'
import { createAdminKubeconfig } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { mapState } from 'vuex'

export default {
  components: {
    CopyBtn,
    CodeBlock,
    GardenloginInfo,
    StaticTokenKubeconfigConfiguration,
    AdminKubeConfigRequest
  },
  mixins: [shootItem],
  props: {
    showListIcon: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'gardenlogin'
    }
  },
  data () {
    return {
      kubeconfigExpansionPanel: false,
      adminKubeConfigExpiration: '30m', // Default 30 minutes
      adminKubeconfig: undefined
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
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
      const defaultExpirations = ['30m', '1h', '3h', '6h', '12h', '1d', '3d', '7d']
      let filteredExpirations = defaultExpirations

      if (this.cfg.shootAdminKubeconfig.maxExpirationSeconds) {
        filteredExpirations = []
        defaultExpirations.forEach((val) => {
          if (this.adminKubeConfigExpirationInSeconds(val) <= this.cfg.shootAdminKubeconfig.maxExpirationSeconds) {
            filteredExpirations.push(val)
          }
        })
      }

      return filteredExpirations
    },
    getQualifiedName () {
      const prefix = this.isGardenloginType ? 'kubeconfig-gardenlogin' : 'kubeconfig'
      return `${prefix}--${this.shootProjectName}--${this.shootName}.yaml`
    }
  },
  methods: {
    async createAdminKubeconfig () {
      try {
        const resp = await createAdminKubeconfig({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            expirationSeconds: this.adminKubeConfigExpirationInSeconds(this.adminKubeConfigExpiration)
          }
        })

        this.adminKubeconfig = Buffer.from(resp.data.status.kubeconfig, 'base64').toString('utf8')
      } catch (err) {
        const errorMessage = 'Could not request admin kubeconfig'
        const errorDetails = errorDetailsFromError(err)
        console.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
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
  },
  watch: {
    kubeconfig (value) {
      this.reset()
    }
  }
}
</script>
