<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="800">
    <v-card>
      <v-card-title class="error">
        <v-icon x-large class="toolbar-title--text icon">mdi-alert-outline</v-icon>
        <span class="headline ml-5 toolbar-title--text">Confirm Delete</span>
      </v-card-title>
      <v-card-text>
        <v-container fluid>
          <span class="subtitle-1">
            Are you sure to delete the secret <span class="font-weight-bold">{{name}}</span>?<br/>
            <span class="error--text font-weight-bold">The operation can not be undone.</span>
          </span>
        </v-container>
        <g-message color="error" :message.sync="errorMessage" :detailed-message.sync="detailedErrorMessage"></g-message>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click.native="hide">Cancel</v-btn>
        <v-btn text @click.native="onDeleteSecret" color="error">Delete Secret</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from 'vuex'
import get from 'lodash/get'
import GMessage from '@/components/GMessage'
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
      deleteSecret: 'deleteInfrastructureSecret'
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
        this.errorMessage = 'Failed to delete Infrastructure Secret.'
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
