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
  <v-list>
    <v-list-tile v-show="!isAnyTileVisible">
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">mdi-alert-circle-outline</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-title>
          Kyma information currently not available
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>

    <v-list-tile v-if="isConsoleTileVisible">
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">developer_board</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Console</v-list-tile-sub-title>
        <v-list-tile-title>
          <v-tooltip v-if="isShootHibernated" top>
            <span class="grey--text" slot="activator">{{consoleUrl}}</span>
            Console is not running for hibernated clusters
          </v-tooltip>
          <a v-else :href="consoleUrl" target="_blank" class="cyan--text text--darken-2">{{consoleUrl}}</a>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>

    <v-divider v-if="isConsoleTileVisible && isCredentialsTileVisible" class="my-2" inset></v-divider>

    <username-password v-if="isCredentialsTileVisible" :username="email" :password="password"></username-password>
  </v-list>
</template>

<script>
import UsernamePassword from '@/components/UsernamePasswordListTile'
import { shootItem } from '@/mixins/shootItem'
import get from 'lodash/get'

export default {
  components: {
    UsernamePassword
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    shootAddonKyma () {
      return get(this.shootItem, 'addonKyma', {})
    },
    consoleUrl () {
      return this.shootAddonKyma.url || ''
    },
    email () {
      return this.shootAddonKyma.email || ''
    },
    password () {
      return this.shootAddonKyma.password || ''
    },
    isAnyTileVisible () {
      return this.isConsoleTileVisible || this.isCredentialsTileVisible
    },
    isConsoleTileVisible () {
      return !!this.consoleUrl
    },
    isCredentialsTileVisible () {
      return !!this.email && !!this.password
    }
  }
}
</script>

<style lang="styl" scoped>
  .v-expansion-panel {
    box-shadow: none;
  }

  >>> .v-expansion-panel__header {
    cursor: auto;
    padding: 0;
  }

  .scroll {
    overflow-x: scroll;
  }

</style>
