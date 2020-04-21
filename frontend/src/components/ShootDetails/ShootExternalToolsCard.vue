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
    <v-toolbar flat dark dense color="cyan darken-2">
      <v-toolbar-title class="subtitle-1">External Tools</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <template v-for="({ title, url, icon = 'link' }, index) in items">
        <v-divider v-if="index" :key="index" inset class="my-2"></v-divider>
        <v-list-item :key="title">
          <v-list-item-icon>
            <v-icon color="cyan darken-2">{{icon}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>{{title}}</v-list-item-subtitle>
            <v-list-item-title>
              <external-link :url="expandUrl(url)" color="cyan darken-2" :size="16">
                {{expandUrl(url)}}
              </external-link>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>

<script>
import get from 'lodash/get'
import template from 'url-template'
import ExternalLink from '@/components/ExternalLink'
import { shootItem } from '@/mixins/shootItem'
import { mapState } from 'vuex'

export default {
  components: {
    ExternalLink
  },
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
