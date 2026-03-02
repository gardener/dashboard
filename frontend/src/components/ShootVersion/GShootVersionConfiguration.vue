<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :icon="shootSupportedPatchAvailable ? 'mdi-arrow-up-bold-circle' : 'mdi-arrow-up-bold-circle-outline'"
    width="450"
    caption="Update Cluster"
    confirm-button-text="Update"
    :confirm-required="confirmRequired"
    :text="buttonText"
    :disabled="!canUpdate"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-shoot-version-update v-model="selectedItem" />
        <template v-if="!v$.$invalid && selectedVersionType === 'minor'">
          <div class="my-2">
            You should always test your scenario and back up all your data before attempting an upgrade. Don’t forget to include the workload inside your cluster!
          </div>
          <div class="my-2">
            You should consider the
            <a
              href="https://github.com/kubernetes/kubernetes/releases"
              target="_blank"
              rel="noopener"
              class="text-anchor"
            >
              Kubernetes release notes
              <v-icon style="font-size:80%">mdi-open-in-new</v-icon>
            </a>
            before upgrading your cluster.
          </div>
          <div class="my-2">
            Type <strong>{{ shootName }}</strong> below and confirm to upgrade the Kubernetes version of your cluster.
          </div>
          <div class="my-2 font-weight-bold">
            This action cannot be undone.
          </div>
        </template>
        <template v-if="!v$.$invalid && selectedVersionType === 'patch'">
          <div class="my-2">
            Applying a patch to your cluster will increase the Kubernetes version which can lead to unexpected side effects.
          </div>
          <div class="my-2 font-weight-bold">
            This action cannot be undone.
          </div>
        </template>
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GShootVersionUpdate from '@/components/ShootVersion/GShootVersionUpdate.vue'
import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

import get from 'lodash/get'

export default {
  components: {
    GActionButtonDialog,
    GShootVersionUpdate,
  },
  inject: ['api', 'logger'],
  props: {
    text: {
      type: Boolean,
      default: false,
    },
  },
  setup () {
    const {
      shootItem,
      shootNamespace,
      shootName,
      shootAvailableK8sUpdates,
      shootSupportedPatchAvailable,
      shootKubernetesVersionObject,
    } = useShootItem()

    const selectedItem = ref(null)

    return {
      v$: useVuelidate(),
      shootItem,
      shootNamespace,
      shootName,
      shootSupportedPatchAvailable,
      shootAvailableK8sUpdates,
      shootKubernetesVersionObject,
      selectedItem,
    }
  },
  computed: {
    canUpdate () {
      return !!this.shootAvailableK8sUpdates
    },
    buttonText () {
      if (!this.text) {
        return
      }
      return 'Update Cluster'
    },
    selectedVersion () {
      return get(this.selectedItem, ['version'])
    },
    selectedVersionType () {
      return get(this.selectedItem, ['updateType'])
    },
    confirmRequired () {
      return this.selectedVersionType !== 'patch'
    },
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.selectedItem = null
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await this.api.updateShootVersion({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            version: this.selectedVersion,
          },
        })
      } catch (err) {
        const errorMessage = 'Update Kubernetes version failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
