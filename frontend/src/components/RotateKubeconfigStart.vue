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
    :loading="isActionToBeScheduled"
    @dialogOpened="startDialogOpened"
    ref="actionDialog"
    :caption="caption"
    icon="mdi-refresh"
    maxWidth="600"
    :confirmRequired="true"
    confirmButtonText="Rotate">
    <template slot="actionComponent">
      <v-layout row wrap>
        <v-flex>
          <div class="py-3">Do you want to start rotation of kubeconfig credentials?
          </div>
          <v-alert :value="true" dense color="warning" icon="priority_high" outline>
            The current kubeconfig credentials will be revoked.
          </v-alert>
          <div class="pt-3">Type <strong>{{shootName}}</strong> below and confirm revokation of current kubeconfig credentials.
          </div>
        </v-flex>
      </v-layout>
    </template>
  </action-icon-dialog>
</template>

<script>
import ActionIconDialog from '@/dialogs/ActionIconDialog'
import { addShootAnnotation } from '@/utils/api'
import { SnotifyPosition } from 'vue-snotify'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    ActionIconDialog
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      actionTriggered: false
    }
  },
  mixins: [shootItem],
  computed: {
    isActionToBeScheduled () {
      return this.shootGardenOperation === 'rotate-kubeconfig-credentials'
    },
    caption () {
      if (this.isActionToBeScheduled) {
        return 'Requesting to schedule kubeconfig credentials rotation'
      }
      return 'Start Kubeconfig Rotation'
    }
  },
  methods: {
    async startDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.start()
      }
    },
    async start () {
      this.actionTriggered = true

      const data = { 'shoot.garden.sapcloud.io/operation': 'rotate-kubeconfig-credentials' }
      try {
        await addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data })
      } catch (err) {
        const errorMessage = 'Could not start rotation of kubeconfig credentials'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

        this.actionTriggered = false
      }
    }
  },
  watch: {
    isActionToBeScheduled (actionToBeScheduled) {
      const isActionScheduled = !actionToBeScheduled && this.actionTriggered
      if (!isActionScheduled) {
        return
      }
      this.actionTriggered = false

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource beeing cleared (e.g. during navigation)
        return
      }
      const config = {
        position: SnotifyPosition.rightBottom,
        timeout: 5000,
        showProgressBar: false
      }
      this.$snotify.success(`Rotation of kubeconfig credentials started for ${this.shootName}`, config)
    }
  }
}
</script>

<style lang="styl" scoped>
  .progress-icon {
    font-size: 15px;
  }

  .vertical-align-middle {
    vertical-align: middle;
  }
</style>
