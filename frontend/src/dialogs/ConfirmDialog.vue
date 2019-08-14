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
  <g-dialog
    ref="gDialog"
    :confirmButtonText="confirmYesButtonText"
    :max-width="maxWidth"
    :defaultColor="defaultColor"
    >
    <template slot="caption">{{captionText}}</template>
    <template slot="message">
      <div v-html="messageHtml"></div>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/dialogs/GDialog'

export default {
  name: 'confirm-dialog',
  components: {
    GDialog
  },
  data () {
    return {
      confirmButtonText: undefined,
      cancelButtonText: undefined,
      captionText: undefined,
      messageHtml: undefined,
      defaultColor: undefined,
      maxWidth: undefined
    }
  },
  methods: {
    waitForConfirmation ({ confirmButtonText, cancelButtonText, captionText, messageHtml, defaultColor, maxWidth } = {}) {
      this.confirmButtonText = confirmButtonText || 'Confirm'
      this.cancelButtonText = cancelButtonText || 'Cancel'
      this.captionText = captionText || 'Confirm'
      this.messageHtml = messageHtml
      this.defaultColor = defaultColor || 'orange'
      this.maxWidth = maxWidth || '400'

      return this.$refs.gDialog.confirmWithDialog()
    }
  }
}
</script>
