<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="800">
    <v-card>
      <v-card-title class="toolbar-background">
        <v-icon size="x-large" class="toolbar-title--text icon">mdi-alert-outline</v-icon>
        <span class="text-h5 ml-5 toolbar-title--text">Confirm Delete</span>
      </v-card-title>
      <v-card-text>
        <v-container fluid>
          <span class="text-subtitle-1">
            Are you sure to delete the secret <span class="font-weight-bold">{{name}}</span>?<br/>
            <span class="text-error font-weight-bold">The operation can not be undone.</span>
          </span>
        </v-container>
        <g-message color="error" v-model:message="errorMessage" v-model:detailed-message="detailedErrorMessage"></g-message>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="hide">Cancel</v-btn>
        <v-btn variant="text" @click="onDeleteSecret" color="toolbar-background">Delete Secret</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from 'vuex'
import get from 'lodash/get'
import GMessage from '@/components/GMessage.vue'
import { errorDetailsFromError } from '@/utils/error'

export default {
  name: 'secret-dialog-delete',
  components: {
    GMessage
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    secret: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined
    }
  },
  computed: {
    visible: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    name () {
      return get(this.secret, 'metadata.name', '')
    }
  },
  methods: {
    ...mapActions({
      deleteSecret: 'deleteCloudProviderSecret'
    }),
    hide () {
      this.visible = false
    },
    async onDeleteSecret () {
      const name = get(this.secret, 'metadata.name')
      try {
        await this.deleteSecret(name)
        this.hide()
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Failed to delete Cloud Provider Secret.'
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.errorMessage = undefined
      this.detailedMessage = undefined
    }
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .icon {
    font-size: 90px;
  }

  .credential_title {
    font-size: 30px;
    font-weight: 400;
  }
</style>
