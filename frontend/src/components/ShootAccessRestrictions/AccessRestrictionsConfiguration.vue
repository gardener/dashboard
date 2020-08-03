<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <action-button-dialog
    :shootItem="shootItem"
    :disabled="disabled"
    :tooltip="tooltip"
    @dialogOpened="onConfigurationDialogOpened"
    ref="actionDialog"
    maxWidth="760"
    caption="Configure Access Restrictions">
    <template v-slot:actionComponent>
      <access-restrictions
        ref="accessRestrictions"
      >
      </access-restrictions>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import AccessRestrictions from '@/components/ShootAccessRestrictions/AccessRestrictions'
import isEmpty from 'lodash/isEmpty'
import cloneDeep from 'lodash/cloneDeep'
import { replaceShoot } from '@/utils/api'
import { shootItem } from '@/mixins/shootItem'
import { mapGetters } from 'vuex'
import { errorDetailsFromError } from '@/utils/error'

export default {
  name: 'access-restriction-configuration',
  components: {
    ActionButtonDialog,
    AccessRestrictions
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'accessRestrictionNoItemsTextForCloudProfileNameAndRegion',
      'accessRestrictionDefinitionsByCloudProfileNameAndRegion'
    ]),
    disabled () {
      const accessRestrictionDefinitions = this.accessRestrictionDefinitionsByCloudProfileNameAndRegion({ cloudProfileName: this.shootCloudProfileName, region: this.shootRegion })
      return isEmpty(accessRestrictionDefinitions)
    },
    noItemsText () {
      return this.accessRestrictionNoItemsTextForCloudProfileNameAndRegion({ cloudProfileName: this.shootCloudProfileName, region: this.shootRegion })
    },
    tooltip () {
      if (!this.disabled) {
        return undefined
      }
      return this.noItemsText
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
        const shootResource = cloneDeep(this.shootItem)
        this.$refs.accessRestrictions.applyTo(shootResource)
        await replaceShoot({ namespace: this.shootNamespace, name: this.shootName, data: shootResource })
      } catch (err) {
        const errorMessage = 'Could not save access restriction configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.$refs.accessRestrictions.setAccessRestrictions({ shootResource: this.shootItem, cloudProfileName: this.shootCloudProfileName, region: this.shootRegion })
    }
  }
}
</script>
