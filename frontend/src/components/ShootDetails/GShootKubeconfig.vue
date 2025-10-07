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
    <g-list-item-content>
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
    <template #append>
      <g-gardenlogin-info :shoot-namespace="shootNamespace" />
      <template v-if="isKubeconfigAvailable">
        <g-action-button
          icon="mdi-download"
          tooltip="Download Kubeconfig"
          @click="onDownload"
        />
        <g-copy-btn :clipboard-text="kubeconfig" />
        <g-action-button
          :icon="visibilityIcon"
          :tooltip="visibilityTitle"
          @click="toggleKubeconfig"
        />
      </template>
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

<script>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import download from 'downloadjs'

import { useAuthzStore } from '@/store/authz'

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GGardenloginInfo from '@/components/GGardenloginInfo.vue'

import { useShootItem } from '@/composables/useShootItem'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GCopyBtn,
    GCodeBlock,
    GGardenloginInfo,
  },
  props: {
    showListIcon: {
      type: Boolean,
      default: false,
    },
  },
  setup () {
    const authzStore = useAuthzStore()
    const {
      canGetCloudProviderCredentials,
    } = storeToRefs(authzStore)

    const {
      shootNamespace,
      shootName,
      shootProjectName,
      shootInfo,
    } = useShootItem()

    const expansionPanel = ref(false)

    return {
      canGetCloudProviderCredentials,
      shootNamespace,
      shootName,
      shootProjectName,
      shootInfo,
      expansionPanel,
    }
  },
  computed: {
    icon () {
      return this.showListIcon ? 'mdi-file' : ''
    },
    kubeconfig () {
      return this.shootInfo?.kubeconfigGardenlogin
    },
    isKubeconfigAvailable () {
      return !!this.kubeconfig
    },
    visibilityIcon () {
      return this.expansionPanel ? 'mdi-eye-off' : 'mdi-eye'
    },
    visibilityTitle () {
      return this.expansionPanel ? 'Hide Kubeconfig' : 'Show Kubeconfig'
    },
    qualifiedName () {
      return `kubeconfig-gardenlogin--${this.shootProjectName}--${this.shootName}.yaml`
    },
  },
  watch: {
    kubeconfig () {
      this.reset()
    },
  },
  methods: {
    toggleKubeconfig () {
      this.expansionPanel = !this.expansionPanel
    },
    reset () {
      this.expansionPanel = false
    },
    onDownload () {
      if (this.kubeconfig) {
        download(this.kubeconfig, this.qualifiedName, 'text/yaml')
      }
    },
  },
}
</script>
