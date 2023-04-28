<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu :nudge-bottom="20" :nudge-right="20" max-height="80%" location="left" v-model="columnSelectionMenu" absolute>
    <template v-slot:activator="{ on: menu }">
      <v-tooltip location="top">
        <template v-slot:activator="{ on: tooltip }">
          <v-btn v-on="{ ...menu, ...tooltip}" icon>
            <v-icon color="toolbar-title">mdi-dots-vertical</v-icon>
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
        <v-list-item-content class="text-primary">
          <v-list-item-title>
            <v-tooltip v-if="header.customField" location="top">
              <template v-slot:activator="{ on: tooltip }">
                <div v-on="tooltip">
                  <v-badge
                    inline
                    icon="mdi-playlist-star"
                    color="primary"
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
          <v-tooltip location="top" style="width: 100%">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" block variant="text" class="text-center text-primary" @click.stop="onReset">
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
      <v-tooltip location="top" :disabled="!filterTooltip">
        <template v-slot:activator="{ on }">
          <div v-on="on">
            <v-list-item
              v-for="filter in filters"
              :key="filter.value"
              :disabled="filter.disabled"
              :class="{ 'disabled_filter' : filter.disabled}"
              @click.stop="onToggleFilter(filter)">
              <v-list-item-action>
                <v-icon :color="checkboxColor(filter.selected)" v-text="checkboxIcon(filter.selected)"/>
              </v-list-item-action>
              <v-list-item-content class="text-primary">
                <v-list-item-title>
                  {{filter.text}}
                  <v-tooltip location="top" v-if="filter.helpTooltip">
                    <template v-slot:activator="{ on }">
                      <v-icon v-on="on" size="small">mdi-help-circle-outline</v-icon>
                    </template>
                    <div :key="line" v-for="line in filter.helpTooltip">{{line}}</div>
                  </v-tooltip>
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </div>
        </template>
        <span>{{filterTooltip}}</span>
      </v-tooltip>
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
    },
    filterTooltip: {
      type: String
    }
  },
  data () {
    return {
      columnSelectionMenu: false
    }
  },
  methods: {
    onSetSelectedHeader (header) {
      this.$emit('set-selected-header', header)
    },
    onReset () {
      this.$emit('reset')
    },
    onToggleFilter (filter) {
      this.$emit('toggle-filter', filter)
    },
    checkboxColor (selected) {
      return selected ? 'primary' : ''
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
