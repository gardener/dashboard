<template>
  <v-select
    color="cyan darken-2"
    :items="machineTypes"
    item-text="name"
    item-value="name"
    v-model="worker.machineType"
    label="Machine Types"
  >
    <template slot="item" slot-scope="data">
      <v-list-tile-content>
        <v-list-tile-title>{{data.item.name}}</v-list-tile-title>
        <v-list-tile-sub-title>CPU: {{data.item.cpu}} | GPU: {{data.item.gpu}} | Memory: {{data.item.memory}}</v-list-tile-sub-title>
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
      machineTypes: {
        type: Array,
        default: () => []
      }
    }
  }
</script>