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
    <template v-if="!isTestingCluster">
      <link-list-tile v-if="!!kibanaUrl"
        icon="developer_board"
        appTitle="Kibana"
        :url="kibanaUrl"
        :urlText="kibanaUrl"
        :isShootStatusHibernated="isShootStatusHibernated"
      ></link-list-tile>
      <template v-if="username && password">
        <v-divider inset></v-divider>
        <username-password :username="username" :password="password"></username-password>
      </template>
    </template>
    <v-list-item v-else>
      <v-list-item-icon>
        <v-icon color="cyan darken-2">mdi-alert-circle-outline</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-title>
          Logging Stack not available for clusters with purpose testing
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>
  </v-list>
</template>

<script>
import UsernamePassword from '@/components/UsernamePasswordListTile'
import LinkListTile from '@/components/LinkListTile'
import get from 'lodash/get'
import { mapGetters } from 'vuex'
import { shootItem } from '@/mixins/shootItem'

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
    ...mapGetters([
      'isAdmin'
    ]),
    kibanaUrl () {
      return get(this.shootItem, 'info.kibanaUrl', '')
    },
    username () {
      return this.isAdmin ? get(this.shootItem, 'seedInfo.logging_username', '') : get(this.shootItem, 'info.logging_username', '')
    },
    password () {
      return this.isAdmin ? get(this.shootItem, 'seedInfo.logging_password', '') : get(this.shootItem, 'info.logging_password', '')
    }
  }
}
</script>
