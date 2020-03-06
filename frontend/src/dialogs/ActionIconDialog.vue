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
  <div v-if="canPatchShoots">
    <v-tooltip top max-width="600px">
      <v-btn slot="activator" :small="smallIcon" icon @click="showDialog" :class="iconClass" :loading="loading" :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose || disabled">
        <v-icon :medium="!smallIcon">{{icon}}</v-icon>
      </v-btn>
      {{shootActionToolTip(caption)}}
    </v-tooltip>
    <g-dialog
      :confirmButtonText="confirmButtonText"
      :confirm-disabled="!valid"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      :max-width="maxWidth"
      :maxHeight="maxHeight"
      :confirmValue="confirmValue"
      :confirmColor="dialogColor"
      :defaultColor="dialogColor"
      ref="gDialog"
      >
      <template slot="caption">{{caption}}</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <slot name="actionComponent"></slot>
      </template>
    </g-dialog>
  </div>
</template>

<script>
import GDialog from '@/dialogs/GDialog'
import { shootItem } from '@/mixins/shootItem'
import { mapGetters } from 'vuex'

export default {
  name: 'action-icon-dialog',
  components: {
    GDialog
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined
    }
  },
  props: {
    shootItem: {
      type: Object
    },
    icon: {
      type: String,
      default: 'mdi-settings-outline'
    },
    caption: {
      type: String
    },
    confirmButtonText: {
      type: String,
      default: 'Save'
    },
    confirmRequired: {
      type: Boolean,
      default: false
    },
    valid: {
      type: Boolean,
      default: true
    },
    maxWidth: {
      type: String,
      default: '1000'
    },
    maxHeight: {
      type: String,
      default: '50vh'
    },
    loading: {
      type: Boolean,
      default: false
    },
    iconClass: {
      type: String
    },
    smallIcon: {
      type: Boolean,
      default: false
    },
    dialogColor: {
      type: String,
      default: 'orange'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'canPatchShoots'
    ]),
    message: {
      get () {
        return this.errorMessage
      },
      set (value) {
        this.$emit('update:errorMessage', value)
      }
    },
    detailedMessage: {
      get () {
        return this.detailedErrorMessage
      },
      set (value) {
        this.$emit('update:detailedErrorMessage', value)
      }
    },
    confirmValue () {
      return this.confirmRequired ? this.shootName : undefined
    }
  },
  methods: {
    showDialog (resetError = true) {
      if (resetError) {
        this.errorMessage = undefined
        this.detailedErrorMessage = undefined
      }
      this.$refs.gDialog.showDialog()
      this.$nextTick(() => {
        // need to defer event until dialog has been rendered
        this.$emit('dialogOpened')
      })
    },
    async waitForDialogClosed () {
      return this.$refs.gDialog.confirmWithDialog()
    },
    setError ({ errorMessage, detailedErrorMessage }) {
      this.errorMessage = errorMessage
      this.detailedErrorMessage = detailedErrorMessage

      this.showDialog(false)
    },
    hideDialog () {
      if (this.$refs.gDialog) {
        this.$refs.gDialog.hideDialog()
      }
    }
  }
}
</script>
