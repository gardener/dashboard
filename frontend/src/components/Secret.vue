<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card :class="cardClass">

    <!-- Header -->
    <v-toolbar :class="toolbarClass" dark>
      <infra-icon v-model="icon" :width="32"></infra-icon>
      <v-toolbar-title class="ml-4">{{infrastructureName}}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="!disabled" icon @click.native.stop="onAdd()">
        <v-icon class="white--text">mdi-plus</v-icon>
      </v-btn>
      <v-btn v-if="!disabled" icon @click.native.stop="onToogleHelp()">
        <v-icon class="white--text">mdi-help-circle-outline</v-icon>
      </v-btn>
    </v-toolbar>
    <div class="description_container" v-if="!hasRows">
      <div class="description mt-4">
        {{description}}
      </div>
    </div>

    <!-- List of the added secrets -->
    <v-list two-line v-else>
      <secret-row
        v-for="secret in rows"
        :key="secret.metadata.bindingName"
        :secret="secret"
        :secretDescriptorKey="secretDescriptorKey"
        @update="onUpdate"
        @delete="onDelete"
      >
       <template v-if="infrastructureKey === 'openstack' && isOwnSecretBinding(secret)" v-slot:rowSubTitle>
          {{secret.data.domainName}} / {{secret.data.tenantName}}
        </template>
        <template v-else-if="infrastructureKey === 'vsphere' && isOwnSecretBinding(secret)" v-slot:rowSubTitle>
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <span v-on="on">{{secret.data.vsphereUsername}}</span>
            </template>
            <span>vSphere Username</span>
          </v-tooltip> / <v-tooltip top>
            <template v-slot:activator="{ on }">
              <span v-on="on">{{secret.data.nsxtUsername}}</span>
            </template>
            <span>NSX-T Username</span>
          </v-tooltip>
        </template>
      </secret-row>
    </v-list>

  </v-card>
</template>

<script>
import { mapGetters } from 'vuex'
import SecretRow from '@/components/SecretRow'
import InfraIcon from '@/components/VendorIcon'
import { isOwnSecretBinding } from '@/utils'

export default {
  components: {
    SecretRow,
    InfraIcon
  },
  props: {
    infrastructureKey: {
      type: String,
      required: true
    },
    infrastructureName: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    secretDescriptorKey: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapGetters([
      'infrastructureSecretsByInfrastructureKind'
    ]),
    rows () {
      return this.infrastructureSecretsByInfrastructureKind(this.infrastructureKey)
    },
    hasRows () {
      return this.rows.length > 0
    },
    cardClass () {
      let cardClass = 'mr-extra'
      if (this.disabled) {
        cardClass = `${cardClass} card_disabled`
      }
      return cardClass
    },
    toolbarClass () {
      return `${this.color} elevation-0`
    }
  },
  methods: {
    onAdd () {
      this.$emit('add', this.infrastructureKey)
    },
    onToogleHelp () {
      this.$emit('toogleHelp', this.infrastructureKey)
    },
    onUpdate (row) {
      this.$emit('update', row)
    },
    onDelete (row) {
      this.$emit('delete', row)
    },
    isOwnSecretBinding (secret) {
      return isOwnSecretBinding(secret)
    }
  }
}
</script>

<style lang="scss" scoped>

  .card_disabled {
    opacity:0.3;
    pointer-events: none
  }

  .description_container {
    .description {
      padding: 30px;
      padding-top: 10px;
      opacity: 0.5;
    }
  }

</style>
