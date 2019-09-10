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
    <v-list-tile v-show="!!kibanaUrl">
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">developer_board</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Kibana</v-list-tile-sub-title>
        <v-list-tile-title>
          <v-tooltip v-if="isShootHibernated" top>
            <span slot="activator">{{kibanaUrl}}</span>
            Kibana is not running for hibernated clusters
          </v-tooltip>
          <a v-else :href="kibanaUrl" target="_blank" class="cyan--text text--darken-2">{{kibanaUrl}}</a>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-divider v-show="!!username && !!password" class="my-2" inset></v-divider>
    <username-password :username="username" :password="password"></username-password>
  </v-list>
</template>

<script>
import UsernamePassword from '@/components/UsernamePasswordListTile'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'

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
    kibanaUrl () {
      return get(this.shootItem, 'info.kibanaUrl', '')
    },
    username () {
      return get(this.shootItem, 'info.logging_username', '')
    },
    password () {
      return get(this.shootItem, 'info.logging_password', '')
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

</style>
