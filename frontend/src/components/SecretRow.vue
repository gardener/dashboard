<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list-item>
    <v-list-item-content>
      <v-list-item-title class="mb-1">
        {{secret.metadata.name}}
        <v-tooltip v-if="!isOwnSecret" top>
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" small class="mx-1">mdi-account-arrow-left</v-icon>
          </template>
          <span>Secret shared by {{secretOwner}}</span>
        </v-tooltip>
        <span style="opacity:0.5">({{relatedShootCountLabel}})</span>
      </v-list-item-title>
      <v-list-item-subtitle>
        <slot name="rowSubTitle" :data="secret.data">{{secretDescriptor}}</slot>
      </v-list-item-subtitle>
    </v-list-item-content>

    <v-list-item-action>
      <v-tooltip top>
        <template v-slot:activator="{ on }">
          <div v-on="on">
            <v-btn :disabled="isDeleteButtonDisabled" icon @click.native.stop="onDelete">
              <v-icon class="error--text">mdi-delete</v-icon>
            </v-btn>
          </div>
        </template>
        <span v-if="!isOwnSecret">You can only delete secrets that are owned by you</span>
        <span v-else-if="relatedShootCount > 0">You can only delete secrets that are currently unused</span>
        <span v-else>Delete Secret</span>
      </v-tooltip>
    </v-list-item-action>

    <v-list-item-action>
      <v-tooltip top>
        <template v-slot:activator="{ on }">
          <div v-on="on">
            <v-btn :disabled="!isOwnSecret" icon @click.native.stop="onUpdate">
              <v-icon class="actionButton--text">mdi-pencil</v-icon>
            </v-btn>
          </div>
        </template>
        <span v-if="!isOwnSecret">You can only edit secrets that are owned by you</span>
        <span v-else>Edit Secret</span>
      </v-tooltip>
    </v-list-item-action>
  </v-list-item>
</template>

<script>
import { mapGetters } from 'vuex'
import get from 'lodash/get'
import filter from 'lodash/filter'
import { isOwnSecret } from '@/utils'

export default {
  props: {
    secret: {
      type: Object
    },
    secretDescriptorKey: {
      type: String,
      default: ''
    }
  },
  computed: {
    ...mapGetters([
      'shootList'
    ]),
    secretDescriptor () {
      if (this.isOwnSecret) {
        return get(this.secret, `data.${this.secretDescriptorKey}`)
      } else {
        return `Owner: ${this.secretOwner}`
      }
    },
    secretOwner () {
      return get(this.secret, 'metadata.secretRef.namespace')
    },
    relatedShootCount () {
      return this.shootsByInfrastructureSecret.length
    },
    shootsByInfrastructureSecret () {
      const name = this.secret.metadata.name
      return filter(this.shootList, ['spec.secretBindingName', name])
    },
    relatedShootCountLabel () {
      const count = this.relatedShootCount
      if (count === 0) {
        return 'currently unused'
      } else {
        return `used by ${count} ${count > 1 ? 'clusters' : 'cluster'}`
      }
    },
    isOwnSecret () {
      return isOwnSecret(this.secret)
    },
    isDeleteButtonDisabled () {
      return this.relatedShootCount > 0 || !this.isOwnSecret
    }
  },
  methods: {
    onUpdate () {
      this.$emit('update', this.secret)
    },
    onDelete () {
      this.$emit('delete', this.secret)
    }
  }
}
</script>
