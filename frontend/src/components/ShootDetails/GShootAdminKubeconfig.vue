<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="isEnabled && canCreateShootsAdminkubeconfig">
    <g-list-item>
      <g-list-item-content>
        Kubeconfig - Time-Limited Access
        <template #description>
          <div class="wrap-text d-flex">
            <span class="mr-2">
              Request a kubeconfig for this Shoot cluster valid for
            </span>
            <g-popover
              v-model="popover"
              toolbar-title="Configure Kubeconfig Lifetime"
              placement="bottom"
              :z-index="2500"
            >
              <template #activator="{ props }">
                <v-chip
                  label
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  class="pointer"
                  v-bind="props"
                >
                  {{ expirationTitle }}
                </v-chip>
              </template>
              <div class="pa-2">
                You can configure the kubeconfig lifetime on the
                <g-text-router-link
                  :to="{ name: 'Settings', query: { namespace: shootNamespace } }"
                  text="Settings"
                />
                page.
              </div>
            </g-popover>
          </div>
        </template>
      </g-list-item-content>
      <template #append>
        <g-action-button
          icon="mdi-download"
          tooltip="Download Kubeconfig"
          :loading="downloadBtnLoading"
          @click.stop="onDownload"
        />
        <g-copy-btn
          :clipboard-text="getCopyKubeConfigText"
          :loading="copyBtnLoading"
        />
        <g-action-button
          :icon="visibilityIcon"
          :tooltip="visibilityTitle"
          :loading="toggleBtnLoading"
          @click.stop="toggleKubeconfig"
        />
      </template>
    </g-list-item>
    <g-list-item
      v-if="expansionPanel"
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
</template>

<script>
import {
  mapActions,
  mapState,
} from 'pinia'
import download from 'downloadjs'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'

import { useShootAdminKubeconfig } from '@/composables/useShootAdminKubeconfig'
import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GCopyBtn,
    GCodeBlock,
    GTextRouterLink,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootNamespace,
      shootName,
      shootProjectName,
    } = useShootItem()

    const {
      expiration,
      isEnabled,
      humanizeExpiration,
    } = useShootAdminKubeconfig()

    return {
      shootNamespace,
      shootName,
      shootProjectName,
      expiration,
      isEnabled,
      humanizeExpiration,
    }
  },
  data () {
    return {
      expansionPanel: false,
      kubeconfig: undefined,
      toggleBtnLoading: false,
      downloadBtnLoading: false,
      copyBtnLoading: false,
      popover: false,
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canCreateShootsAdminkubeconfig',
    ]),
    visibilityIcon () {
      return this.expansionPanel ? 'mdi-eye-off' : 'mdi-eye'
    },
    visibilityTitle () {
      return this.expansionPanel ? 'Hide Kubeconfig' : 'Show Kubeconfig'
    },
    qualifiedName () {
      return `kubeconfig--${this.shootProjectName}--${this.shootName}.yaml`
    },
    expirationTitle () {
      return this.humanizeExpiration(this.expiration)
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

        this.kubeconfig = response.data.kubeconfig

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
      if (!this.expansionPanel) {
        this.toggleBtnLoading = true
        const success = await this.createAdminKubeconfig()
        this.toggleBtnLoading = false
        if (!success) {
          return
        }
      }
      this.expansionPanel = !this.expansionPanel
    },
    async getCopyKubeConfigText () {
      this.copyBtnLoading = true
      const success = await this.createAdminKubeconfig()
      this.copyBtnLoading = false
      if (!success) {
        return
      }
      return this.kubeconfig
    },
    async onDownload () {
      this.downloadBtnLoading = true
      const success = await this.createAdminKubeconfig()
      this.downloadBtnLoading = false
      if (!success) {
        return
      }

      download(this.kubeconfig, this.qualifiedName, 'text/yaml')
    },
  },
}
</script>
