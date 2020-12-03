<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="800">
    <v-card>
      <card-svg-title>
        <template v-slot:svgComponent>
            <secret-background color="error"></secret-background>
        </template>
        <v-icon x-large class="accentTitle--text icon">mdi-alert-outline</v-icon>
        <span class="headline ml-5 accentTitle--text">Confirm Delete</span>
      </card-svg-title>
      <v-card-text>
        <v-container fluid>
          Are you sure to delete the secret <span class="font-weight-bold">{{name}}</span>?<br/>
          <span class="error--text font-weight-bold">The operation can not be undone.</span>
        </v-container>
        <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
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
import GAlert from '@/components/GAlert'
import SecretBackground from '@/components/backgrounds/SecretBackground.vue'
import { errorDetailsFromError } from '@/utils/error'
import CardSvgTitle from '@/components/CardSvgTitle.vue'

export default {
  name: 'secret-dialog-delete',
  components: {
    GAlert,
    SecretBackground,
    CardSvgTitle
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
