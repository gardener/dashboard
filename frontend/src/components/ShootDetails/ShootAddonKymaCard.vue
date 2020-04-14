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
    <v-list-item v-show="!isAnyTileVisible">
      <v-list-item-action>
        <v-icon class="cyan--text text--darken-2">mdi-alert-circle-outline</v-icon>
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>
          {{kymaTitle}} information currently not available
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>

    <link-list-tile v-if="isConsoleTileVisible" icon="developer_board" appTitle="Console" :url="consoleUrl" :urlText="consoleUrl" :isShootStatusHibernated="isShootStatusHibernated"></link-list-tile>

    <v-divider v-if="isConsoleTileVisible && isCredentialsTileVisible" class="my-2" inset></v-divider>

    <username-password v-if="isCredentialsTileVisible" :email="email" :password="password"></username-password>
  </v-list>
</template>

<script>
import UsernamePassword from '@/components/UsernamePasswordListTile'
import LinkListTile from '@/components/LinkListTile'
import { shootItem } from '@/mixins/shootItem'
import get from 'lodash/get'
import { shootAddonByName } from '@/utils'

export default {
  components: {
    UsernamePassword,
    LinkListTile
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    kymaTitle () {
      const kymaAddon = shootAddonByName('kyma')
      return get(kymaAddon, 'title')
    },
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

<style lang="scss" scoped>
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
