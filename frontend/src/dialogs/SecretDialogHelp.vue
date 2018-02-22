<!--
Copyright 2018 by The Gardener Authors.

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
  <v-dialog v-model="visible" max-width="750">
    <v-card>

      <v-card-media
        class="white--text"
        height="90px"
        :src="backgroundSrc"
      >
        <v-container>
          <v-layout>
            <v-flex xs1>
              <v-icon large class="white--text ml-3">mdi-help-circle-outline</v-icon>
            </v-flex>
            <v-flex>
              <div class="credential_title">{{title}}</div>
            </v-flex>
          </v-layout>
        </v-container>
      </v-card-media>

      <v-card-text>
        <slot name="help-content"></slot>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn :class="`${color}--text`" flat  @click.native.stop="visible = false">
          Got it
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  export default {
    props: {
      title: {
        type: String,
        required: true
      },
      value: {
        type: Boolean,
        required: true
      },
      color: {
        type: String,
        required: true
      },
      backgroundSrc: {
        type: String,
        required: true
      }
    },
    computed: {
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      }
    }
  }
</script>



<style lang="styl" scoped>

  .infra_icon {
    font-size:90px !important;
  }

  .credential_title {
    font-size:24px
    font-weight:400
  }

</style>
