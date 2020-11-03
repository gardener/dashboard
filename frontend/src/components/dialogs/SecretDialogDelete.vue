<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="800">
    <v-card>
      <v-img
        class="white--text"
        height="130px"
        :src="backgroundSrc"
      >
        <v-container class="fill-height" >
          <v-row class="fill-height" align="center" justify="start" >
            <v-col cols="1">
              <v-icon x-large class="white--text icon">mdi-alert-outline</v-icon>
            </v-col>
            <v-col>
              <div class="credential_title">Confirm Delete</div>
            </v-col>
          </v-row>
        </v-container>
      </v-img>

      <v-card-text>
        <v-container fluid>
          Are you sure to delete the secret <span class="font-weight-bold">{{name}}</span>?<br/>
          <span class="red--text font-weight-bold">The operation can not be undone.</span>
        </v-container>
        <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click.native="hide">Cancel</v-btn>
        <v-btn text @click.native="onDeleteSecret" color="red">Delete Secret</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from 'vuex'
import get from 'lodash/get'
import GAlert from '@/components/GAlert'
import { errorDetailsFromError } from '@/utils/error'

export default {
  name: 'secret-dialog-delete',
  components: {
    GAlert
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    secret: {
      type: Object,
      required: true
    },
    backgroundSrc: {
      type: String,
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
      const bindingName = get(this.secret, 'metadata.bindingName')
      try {
        await this.deleteSecret(bindingName)
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
