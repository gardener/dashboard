<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shootItem="shootItem"
    @dialogOpened="onConfigurationDialogOpened"
    ref="actionDialog"
    :caption="caption"
    :icon="icon"
    :confirmButtonText="confirmText"
    :confirmRequired="confirmRequired"
    :disabled="!isHibernationPossible && !isShootSettingHibernated"
    :buttonText="buttonText"
     maxWidth="600">
    <template v-slot:actionComponent>
      <template v-if="!isShootSettingHibernated">
        This will scale the worker nodes of your cluster down to zero.<br /><br />
        Type <b>{{shootName}}</b> below and confirm to hibernate your cluster.<br /><br />
      </template>
      <template v-else>
        This will wake up your cluster and scale the worker nodes up to their previous count.<br /><br />
      </template>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import { updateShootHibernation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import { SnotifyPosition } from 'vue-snotify'

export default {
  components: {
    ActionButtonDialog
  },
  props: {
    shootItem: {
      type: Object
    },
    text: {
      type: Boolean
    }
  },
  mixins: [shootItem],
  data () {
    return {
      hibernationChanged: false
    }
  },
  computed: {
    confirmRequired () {
      return !this.isShootSettingHibernated
    },
    confirmText () {
      if (!this.isShootSettingHibernated) {
        return 'Hibernate'
      } else {
        return 'Wake up'
      }
    },
    icon () {
      if (!this.isShootSettingHibernated) {
        return 'mdi-pause-circle-outline'
      } else {
        return 'mdi-play-circle-outline'
      }
    },
    buttonTitle () {
      if (!this.isShootSettingHibernated) {
        return 'Hibernate Cluster'
      } else {
        return 'Wake up Cluster'
      }
    },
    caption () {
      if (!this.isHibernationPossible && !this.isShootSettingHibernated) {
        return this.hibernationPossibleMessage
      }
      return this.buttonTitle
    },
    buttonText () {
      if (!this.text) {
        return
      }
      return this.buttonTitle
    }
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
        await updateShootHibernation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            enabled: !this.isShootSettingHibernated
          }
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
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        this.hibernationChanged = false
      }
    }
  },
  watch: {
    isShootSettingHibernated (value) {
      // hide dialog if hibernation state changes
      if (this.$refs.actionDialog) {
        this.$refs.actionDialog.hideDialog()
      }
    },
    isShootStatusHibernationProgressing (hibernationProgressing) {
      if (hibernationProgressing || !this.hibernationChanged) {
        return
      }
      this.hibernationChanged = false

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource beeing cleared (e.g. during navigation)
        return
      }
      const config = {
        position: SnotifyPosition.rightBottom,
        timeout: 5000,
        showProgressBar: false
      }
      if (this.isShootStatusHibernated) {
        this.$snotify.success(`Cluster ${this.shootName} successfully hibernated`, config)
      } else {
        this.$snotify.success(`Cluster ${this.shootName} successfully started`, config)
      }
    }
  }
}
</script>
