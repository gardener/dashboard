<!--
Copyright 2018 by The Gardener Authors.

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
  <v-card :class="cardClass">

    <!-- Header -->
    <v-toolbar :class="toolbarClass" dark>
      <v-icon class="white--text pr-2">{{icon}}</v-icon>
      <v-toolbar-title>{{infrastructureName}}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="!disabled" icon @click.native.stop="onAdd()">
        <v-icon class="white--text">add</v-icon>
      </v-btn>
      <v-btn v-if="!disabled" icon @click.native.stop="onToogleHelp()">
        <v-icon class="white--text">mdi-help-circle-outline</v-icon>
      </v-btn>
    </v-toolbar>
    <div class="description_container" v-if="!hasRows">
      <div class="description mt-3">
        {{description}}
      </div>
    </div>

    <!-- List of the added secrets -->
    <v-list two-line v-else>
      <v-list-tile v-for="row in rows" :key="row.metadata.name">
        <v-list-tile-content>
          <v-list-tile-title>
            {{row.metadata.name}}
            <v-icon v-if="!isPrivateSecretBinding(row)">mdi-share</v-icon>
            <span style="opacity:0.5">({{relatedShootCountLabel(row)}})</span>
          </v-list-tile-title>
          <v-list-tile-sub-title>
            <slot name="rowSubTitle" :data="row.data">{{secretDescriptor(row)}}</slot>
          </v-list-tile-sub-title>
        </v-list-tile-content>

        <v-list-tile-action v-if="relatedShootCount(row)===0 && isPrivateSecretBinding(row)">
          <v-btn icon @click.native.stop="onDelete(row)">
            <v-icon class="red--text">delete</v-icon>
          </v-btn>
        </v-list-tile-action>

        <v-list-tile-action v-if="isPrivateSecretBinding(row)">
          <v-btn icon @click.native.stop="onUpdate(row)">
            <v-icon class="blue--text">edit</v-icon>
          </v-btn>
        </v-list-tile-action>

      </v-list-tile>
    </v-list>

  </v-card>
</template>

<script>
  import { mapGetters } from 'vuex'
  import get from 'lodash/get'
  import { isPrivateSecretBinding } from '@/utils'

  export default {
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
        'shootsByInfrastructureSecret',
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
          cardClass = `${cardClass} card__disabled`
        }
        return cardClass
      },
      toolbarClass () {
        return `${this.color} elevation-0`
      },
      secretDescriptor () {
        return (secret) => {
          if (this.isPrivateSecretBinding(secret)) {
            return get(secret, `data.${this.secretDescriptorKey}`)
          } else {
            return get(secret, 'metadata.namespace')
          }
        }
      },
      relatedShootCount () {
        return (secret) => {
          return this.shootsByInfrastructureSecret(secret.metadata.name, secret.metadata.namespace).length
        }
      },
      relatedShootCountLabel () {
        return (secret) => {
          const count = this.relatedShootCount(secret)
          if (count === 0) {
            return 'currently unused'
          } else {
            return `used by ${count} ${count > 1 ? 'clusters' : 'cluster'}`
          }
        }
      },
      isPrivateSecretBinding () {
        return (secret) => {
          return isPrivateSecretBinding(secret)
        }
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
      }
    }
  }
</script>

<style lang="styl" scoped>

  .card__disabled {
    opacity:0.3;
    pointer-events: none
  }

  .description_container {
    .description {
      padding: 30px;
      padding-top: 10px
      opacity: 0.5;
    }
  }

</style>