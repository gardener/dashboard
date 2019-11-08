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
    :valid="valid"
    @dialogOpened="onConfigurationDialogOpened"
    ref="actionDialog"
    maxWidth="400"
    caption="Configure Purpose">
    <template slot="actionComponent">
      <v-select
        color="cyan darken-2"
        label="Purpose"
        :items="purposes"
        v-model="purpose"
        hint="Indicate the importance of the cluster"
        persistent-hint
        ></v-select>
    </template>
  </action-icon-dialog>
</template>

<script>
import ActionIconDialog from '@/dialogs/ActionIconDialog'
import { addShootAnnotation } from '@/utils/api'
import { purposesForSecret } from '@/utils'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  name: 'purpose-configuration',
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
      purpose: null
    }
  },
  computed: {
    valid () {
      return !!this.purpose
    },
    purposes () {
      return purposesForSecret(this.shootSecretBindingName)
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const purposeAnnotation = {
          'garden.sapcloud.io/purpose': this.purpose
        }
        await addShootAnnotation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: purposeAnnotation
        })
      } catch (err) {
        const errorMessage = 'Could not update purpose'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.purpose = this.shootPurpose
    }
  }
}
</script>
