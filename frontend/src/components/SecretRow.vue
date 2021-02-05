<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr>
    <td v-if="selectedHeaders.name">
      <div class="d-flex">
        {{item.name}}
        <v-tooltip v-if="!item.isOwnSecret" top>
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" small class="mx-1">mdi-account-arrow-left</v-icon>
          </template>
          <span>Secret shared by {{item.ownernamespace}}</span>
        </v-tooltip>
      </div>
    </td>
    <td v-if="selectedHeaders.infrastructure">
      <vendor extended :cloud-provider-kind="item.infrastructureName" :cloud-profile-name="item.cloudProfileName"></vendor>
    </td>
    <td v-if="selectedHeaders.details">
      <v-list color="transparent">
        <v-list-item class="pa-0">
          <v-list-item-content class="pa-0">
            <v-list-item-subtitle>
              <span v-for="({ label }, index) in item.details" :key="label">
                <span>{{label}}</span>
                <span v-if="index !== item.details.length - 1"> / </span>
              </span>
            </v-list-item-subtitle>
            <v-list-item-title>
              <span v-for="({ value }, index) in item.details" :key="value">
                <span v-if="value">{{value}}</span>
                <span v-else class="font-weight-light text--disabled">unknown</span>
                <span v-if="index !== item.details.length - 1"> / </span>
              </span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </td>
    <td v-if="selectedHeaders.relatedShootCount">
      <div class="d-flex">
        {{item.relatedShootCountLabel}}
      </div>
    </td>
    <td v-if="selectedHeaders.actions">
      <div class="d-flex flex-row justify-end">
        <v-tooltip top v-if="canPatchSecrets">
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <v-btn :disabled="!item.isOwnSecret || !item.isSupportedInfrastructure" icon @click="onUpdate">
                <v-icon class="action-button--text">mdi-pencil</v-icon>
              </v-btn>
            </div>
          </template>
          <span v-if="!item.isOwnSecret">You can only edit secrets that are owned by you</span>
          <span v-else-if="!item.isSupportedInfrastructure">This infrastructure type is currently not supported by the dashboard</span>
          <span v-else>Edit Secret</span>
        </v-tooltip>
        <v-tooltip top v-if="canDeleteSecrets">
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <v-btn :disabled="item.relatedShootCount > 0 || !item.isOwnSecret" icon @click="onDelete">
                <v-icon class="error--text">mdi-delete</v-icon>
              </v-btn>
            </div>
          </template>
          <span v-if="!item.isOwnSecret">You can only delete secrets that are owned by you</span>
          <span v-else-if="item.relatedShootCount > 0">You can only delete secrets that are currently unused</span>
          <span v-else>Delete Secret</span>
        </v-tooltip>
      </div>
    </td>
  </tr>
</template>

<script>

import { mapTableHeader } from '@/utils'
import Vendor from '@/components/Vendor'
import { mapGetters } from 'vuex'

export default {
  components: {
    Vendor
  },
  props: {
    item: {
      type: Object,
      required: true
    },
    headers: {
      type: Array,
      required: true
    }
  },
  computed: {
    selectedHeaders () {
      return mapTableHeader(this.headers, 'selected')
    },
    ...mapGetters([
      'canDeleteSecrets',
      'canPatchSecrets'
    ])
  },
  methods: {
    onUpdate () {
      this.$emit('update', this.item.secret)
    },
    onDelete () {
      this.$emit('delete', this.item.secret)
    }
  }
}
</script>
