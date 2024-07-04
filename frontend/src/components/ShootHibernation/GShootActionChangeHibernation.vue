<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="600"
    :caption="caption"
    :text="buttonText"
    :confirm-button-text="confirmButtonText"
    :confirm-required="confirmRequired"
    :disabled="disabled"
    :icon="icon"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <template v-if="!isShootSettingHibernated">
          This will scale the worker nodes of your cluster down to zero.<br><br>
          Type <strong>{{ shootName }}</strong> below and confirm to hibernate your cluster.<br><br>
        </template>
        <template v-else-if="hasShootWorkerGroups">
          This will wake up your cluster and scale the worker nodes up to their previous count.<br><br>
        </template>
        <template v-else>
          This will wake up your cluster.<br><br>
        </template>
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import {
  ref,
  computed,
  watch,
} from 'vue'

import { useAppStore } from '@/store/app'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog.vue'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
  },
  inject: ['api', 'logger'],
  props: {
    text: {
      type: Boolean,
      default: false,
    },
  },
  setup (props) {
    const {
      shootItem,
      shootNamespace,
      shootName,
      isShootSettingHibernated,
      hasShootWorkerGroups,
      isHibernationPossible,
      hibernationPossibleMessage,
      isShootStatusHibernated,
      isShootStatusHibernationProgressing,
    } = useShootItem()

    const confirmRequired = computed(() => {
      return !isShootSettingHibernated.value
    })

    const disabled = computed(() => {
      return !isShootSettingHibernated.value && !isHibernationPossible.value
    })

    const confirmButtonText = computed(() => {
      return !isShootSettingHibernated.value
        ? 'Hibernate'
        : 'Wake up'
    })

    const icon = computed(() => {
      return !isShootSettingHibernated.value
        ? 'mdi-pause-circle-outline'
        : 'mdi-play-circle-outline'
    })

    const buttonTitle = computed(() => {
      return !isShootSettingHibernated.value
        ? 'Hibernate Cluster'
        : 'Wake up Cluster'
    })

    const buttonText = computed(() => {
      return !props.text
        ? ''
        : buttonTitle.value
    })

    const caption = computed(() => {
      return !isHibernationPossible.value && !isShootSettingHibernated.value
        ? hibernationPossibleMessage.value
        : buttonTitle.value
    })

    const hibernationChanged = ref(false)

    const appStore = useAppStore()

    watch(isShootStatusHibernationProgressing, value => {
      if (value || !hibernationChanged.value) {
        return
      }
      hibernationChanged.value = false

      if (!shootName.value) { // ensure that notification is not triggered by shoot resource being cleared (e.g. during navigation)
        return
      }

      const state = isShootStatusHibernated.value
        ? 'hibernated'
        : 'started'

      appStore.setSuccess(`Cluster ${shootName.value} successfully ${state}`)
    })

    return {
      shootItem,
      shootNamespace,
      shootName,
      isShootSettingHibernated,
      hasShootWorkerGroups,
      isHibernationPossible,
      hibernationPossibleMessage,
      isShootStatusHibernated,
      isShootStatusHibernationProgressing,
      hibernationChanged,
      confirmRequired,
      disabled,
      confirmButtonText,
      icon,
      buttonText,
      caption,
    }
  },
  watch: {
    isShootSettingHibernated (value) {
      // hide dialog if hibernation state changes
      if (this.$refs.actionDialog) {
        this.$refs.actionDialog.hideDialog()
      }
    },
  },
  methods: {
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      this.hibernationChanged = true
      try {
        await this.api.updateShootHibernation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            enabled: !this.isShootSettingHibernated,
          },
        })
      } catch (err) {
        let errorMessage
        if (!this.isShootSettingHibernated) {
          errorMessage = 'Could not hibernate cluster'
        } else {
          errorMessage = 'Could not wake up cluster from hibernation'
        }
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        this.hibernationChanged = false
      }
    },
  },
}
</script>
