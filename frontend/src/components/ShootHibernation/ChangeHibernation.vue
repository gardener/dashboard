<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <action-icon-dialog
    :shootItem="shootItem"
    @dialogOpened="onConfigurationDialogOpened"
    ref="actionDialog"
    :caption="caption"
    :icon="icon"
    :confirmButtonText="confirmText"
    :confirmRequired="confirmRequired"
    :disabled="!isHibernationPossible"
    maxWidth="600">
    <template slot="actionComponent">
      <template v-if="!isShootSettingHibernated">
        This will scale the worker nodes of your cluster down to zero.<br /><br />
        Type <b>{{shootName}}</b> below and confirm to hibernate your cluster.<br /><br />
      </template>
      <template v-else>
        This will wake up your cluster and scale the worker nodes up to their previous count.<br /><br />
      </template>
    </template>
  </action-icon-dialog>
</template>

<script>
import ActionIconDialog from '@/dialogs/ActionIconDialog'
import { updateShootHibernation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import { SnotifyPosition } from 'vue-snotify'

export default {
  components: {
    ActionIconDialog
  },
  props: {
    shootItem: {
      type: Object
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
    caption () {
      if (!this.isHibernationPossible) {
        return this.hibernationPossibleMessage
      }
      if (!this.isShootSettingHibernated) {
        return 'Hibernate Cluster'
      } else {
        return 'Wake up Cluster'
      }
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
