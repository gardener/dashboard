<template>
  <v-select
    color="cyan darken-2"
    :items="volumeTypes"
    item-text="name"
    item-value="name"
    v-model="worker.volumeType"
    label="Volume Type">
    <template slot="item" slot-scope="data">
      <v-list-tile-content>
        <v-list-tile-title>{{data.item.name}}</v-list-tile-title>
        <v-list-tile-sub-title>Class: {{data.item.class}}</v-list-tile-sub-title>
      </v-list-tile-content>
    </template>
  </v-select>
</template>

<script>
export default {
  props: {
    worker: {
      type: Object,
      required: true
    },
    volumeTypes: {
      type: Array,
      default: () => []
    }
  }
}
</script>
