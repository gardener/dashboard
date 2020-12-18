<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu :nudge-bottom="20" :nudge-right="20" left v-model="columnSelectionMenu" absolute>
    <template v-slot:activator="{ on: menu }">
      <v-tooltip open-delay="500" top>
        <template v-slot:activator="{ on: tooltip }">
          <v-btn v-on="{ ...menu, ...tooltip}" icon>
            <v-icon class="cursor-pointer" color="white">mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        Table Options
      </v-tooltip>
    </template>
    <v-list subheader dense>
      <v-subheader>Column Selection</v-subheader>
      <v-list-item v-for="header in headers" :key="header.value" @click.stop="onSetSelectedHeader(header)">
        <v-list-item-action>
          <v-icon :color="checkboxColor(header.selected)" v-text="checkboxIcon(header.selected)"/>
        </v-list-item-action>
        <v-list-item-content class="grey--text text--darken-2">
          <v-list-item-title>
            <v-tooltip v-if="header.customField" top open-delay="500">
              <template v-slot:activator="{ on: tooltip }">
                <div v-on="tooltip">
                  <v-badge
                    inline
                    icon="mdi-playlist-star"
                    color="cyan darken-2"
                    class="mt-0"
                  >
                    <span>{{ header.text }}</span>
                  </v-badge>
                </div>
              </template>
              Custom Field
            </v-tooltip>
            <template v-else>{{ header.text }}</template>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <v-tooltip top style="width: 100%">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" block text class="text-center cyan--text text--darken-2" @click.stop="onReset">
                Reset
              </v-btn>
            </template>
            <span>Reset to Defaults</span>
          </v-tooltip>
        </v-list-item-content>
      </v-list-item>
    </v-list>
    <v-list subheader dense v-if="filters && filters.length">
      <v-subheader>Filter Table</v-subheader>
      <v-list-item
        v-for="filter in filters"
        :key="filter.value"
        :disabled="filter.disabled"
        :class="{ 'disabled_filter' : filter.disabled}"
        @click.stop="onToggleFilter(filter)">
        <v-list-item-action>
          <v-icon :color="checkboxColor(filter.selected)" v-text="checkboxIcon(filter.selected)"/>
        </v-list-item-action>
        <v-list-item-content class="grey--text text--darken-2">
          <v-list-item-title>
            {{filter.text}}
            <v-tooltip top v-if="filter.helpTooltip">
              <template v-slot:activator="{ on }">
                <v-icon v-on="on" small>mdi-help-circle-outline</v-icon>
              </template>
              <div :key="line" v-for="line in filter.helpTooltip">{{line}}</div>
            </v-tooltip>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>

export default {
  name: 'hint-colorizer',
  props: {
    headers: {
      type: Array
    },
    filters: {
      type: Array
    }
  },
  data () {
    return {
      columnSelectionMenu: false
    }
  },
  methods: {
    onSetSelectedHeader (header) {
      this.$emit('setSelectedHeader', header)
    },
    onReset () {
      this.$emit('reset')
    },
    onToggleFilter (filter) {
      this.$emit('toggleFilter', filter)
    },
    checkboxColor (selected) {
      return selected ? 'cyan darken-2' : ''
    },
    checkboxIcon (selected) {
      return selected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'
    }
  }
}
</script>

<style lang="scss" scoped >

  .disabled_filter {
    opacity: 0.5;
  }

</style>
