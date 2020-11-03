<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <v-container fluid class="fill-height text-center">
    <v-row align="center">
      <v-col>
        <h1>{{code}}</h1>
        <h2>{{text}}</h2>
        <p v-if="message">{{message}}</p>
        <v-btn dark color="cyan darken-2" @click="onClick" class="mt-12">{{buttonText}}</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  props: {
    code: {
      type: [String, Number],
      default: '500'
    },
    text: {
      type: String,
      default: 'Unexpected Error :('
    },
    message: {
      type: String
    },
    buttonText: {
      type: String,
      default: 'Get me out of here'
    }
  },
  data () {
    return {
      fromRoute: undefined
    }
  },
  methods: {
    onClick () {
      this.$emit('click', this.fromRoute)
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.fromRoute = from
    })
  }
}
</script>

<style lang="scss" scoped>
  h1 {
    font-size: 160px;
    line-height: 160px;
    font-weight: bold;
    color: #515151;
    margin-bottom: 0;
  }
  h2 {
    font-size: 36px;
    font-weight: 300;
    color: #999999;
  }
</style>
