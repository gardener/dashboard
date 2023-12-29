<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="isEnabled">
    <g-list-item>
      <template #prepend>
        <v-icon
          :icon="icon"
          color="primary"
        />
      </template>
      <g-list-item-content>
        Admin Kubeconfig
        <div class="text-body-2 d-flex">
          <span class="mr-2">
            Request a kubeconfig valid for
          </span>
          <g-popover
            v-model="popover"
            toolbar-title="Configure Admin Kubeconfig Lifetime"
            placement="bottom"
            :z-index="2500"
          >
            <template #activator="{ props }">
              <v-chip
                label
                size="x-small"
                color="primary"
                variant="outlined"
                class="pointer"
                v-bind="props"
              >
                {{ adminKubeConfigExpirationTitle }}
              </v-chip>
            </template>
            <div class="pa-2">
              You can configure the <span class="font-weight-bold">kubeconfig lifetime</span> on the
              <g-text-router-link
                :to="{ name: 'Settings', query: { namespace: shootNamespace } }"
                text="Settings"
              />
              page.
            </div>
          </g-popover>
        </div>
      </g-list-item-content>
      <template #append>
        <g-action-button
          icon="mdi-download"
          tooltip="Download Kubeconfig"
          :loading="adminKubeconfigLoading.download"
          @click.stop="onDownload"
        />
        <g-copy-btn
          :clipboard-text="getCopyKubeConfigText"
          :loading="adminKubeconfigLoading.copy"
        />
        <g-action-button
          :icon="kubeconfigVisibilityIcon"
          :tooltip="kubeconfigVisibilityTitle"
          :loading="adminKubeconfigLoading.toggle"
          @click.stop="toggleKubeconfig"
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
          :content="adminKubeconfig"
          :show-copy-button="false"
        />
      </g-list-item-content>
    </g-list-item>
  </template>
</template>

<script>
import { mapActions } from 'pinia'
import download from 'downloadjs'

import { useAppStore } from '@/store/app'

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'

import { useShootAdminKubeconfig } from '@/composables/useShootAdminKubeconfig'

import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GCopyBtn,
    GCodeBlock,
    GTextRouterLink,
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
  setup () {
    const shootAdminKubeconfig = useShootAdminKubeconfig()
    return {
      ...shootAdminKubeconfig,
    }
  },
  data () {
    return {
      kubeconfigExpansionPanel: false,
      adminKubeconfig: undefined,
      adminKubeconfigLoading: {
        toggle: false,
        copy: false,
        download: false,
      },
      popover: false,
    }
  },
  computed: {
    icon () {
      return this.showListIcon ? 'mdi-file' : ''
    },
    kubeconfigVisibilityIcon () {
      return this.kubeconfigExpansionPanel ? 'mdi-eye-off' : 'mdi-eye'
    },
    kubeconfigVisibilityTitle () {
      return this.kubeconfigExpansionPanel ? 'Hide Kubeconfig' : 'Show Kubeconfig'
    },
    getQualifiedName () {
      return `kubeconfig--${this.shootProjectName}--${this.shootName}.yaml`
    },
    adminKubeConfigExpirationTitle () {
      return this.humanizeExpiration(this.expiration)
    },
  },
  watch: {
    kubeconfig (value) {
      this.reset()
    },
  },
  methods: {
    ...mapActions(useAppStore, [
      'setError',
    ]),
    async createAdminKubeconfig () {
      try {
        const response = await this.api.createShootAdminKubeconfig({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            expirationSeconds: this.expiration,
          },
        })

        this.adminKubeconfig = response.data.kubeconfig

        return true
      } catch (err) {
        const errorMessage = 'Could not request admin kubeconfig'
        const errorDetails = errorDetailsFromError(err)
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

        this.setError(err)

        return false
      }
    },
    async toggleKubeconfig () {
      if (!this.kubeconfigExpansionPanel) {
        this.adminKubeconfigLoading.toggle = true
        const success = await this.createAdminKubeconfig()
        this.adminKubeconfigLoading.toggle = false
        if (!success) {
          return
        }
      }
      this.kubeconfigExpansionPanel = !this.kubeconfigExpansionPanel
    },
    async getCopyKubeConfigText () {
      this.adminKubeconfigLoading.copy = true
      const success = await this.createAdminKubeconfig()
      this.adminKubeconfigLoading.copy = false
      if (!success) {
        return
      }
      return this.adminKubeconfig
    },
    async onDownload () {
      this.adminKubeconfigLoading.download = true
      const success = await this.createAdminKubeconfig()
      this.adminKubeconfigLoading.download = false
      if (!success) {
        return
      }

      download(this.adminKubeconfig, this.getQualifiedName, 'text/yaml')
    },
  },
}
</script>
