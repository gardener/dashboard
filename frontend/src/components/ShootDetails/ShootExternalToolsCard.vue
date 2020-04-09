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
  <v-card v-if="items.length">
    <v-card-title class="subheading white--text cyan darken-2 statusTitle">
      External Tools
    </v-card-title>
    <div class="list">
      <v-list>
        <template v-for="({ title, url, icon = 'link' }, index) in items">
        <v-divider v-if="index" :key="index" class="my-2" inset></v-divider>
        <v-list-tile :key="title">
          <v-list-tile-action>
            <v-icon class="cyan--text text--darken-2">{{icon}}</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-sub-title>{{title}}</v-list-tile-sub-title>
            <v-list-tile-title>
              <a :href="expandUrl(url)" target="_blank" class="cyan--text text--darken-2">{{expandUrl(url)}}</a>
            </v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        </template>
      </v-list>
    </div>
  </v-card>
</template>

<script>
import get from 'lodash/get'
import template from 'url-template'
import { shootItem } from '@/mixins/shootItem'
import { mapState } from 'vuex'

export default {
  mixins: [shootItem],
  props: {
    shootItem: {
      type: Object
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    items () {
      return get(this.cfg, 'externalTools', [])
    }
  },
  methods: {
    expandUrl (url) {
      try {
        return template.parse(url).expand(this.shootMetadata)
      } catch (err) {
        console.error(`Failed to parse URL template "${url}"`)
        return url
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .statusTitle {
    line-height: 10px;
  }

  .list {
    padding-top: 8px;
    padding-bottom: 8px;
  }
</style>
