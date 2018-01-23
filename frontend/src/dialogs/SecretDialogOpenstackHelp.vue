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
      <v-card-title class="orange white--text darken-2">
        <v-icon large class="white--text ml-3">mdi-help-circle-outline</v-icon>
        <span>About Openstack Secrets</span>
      </v-card-title>
      <v-card-text class="helpContent">
        <p>
          Before you can provision and access a Kubernetes cluster on Openstack, you need to add account credentials.
          The Gardener needs the credentials to provision and operate the Openstack infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the user has privileges to <b>create, modify and delete VMs</b>.
        </p>
        <p>
          Read the
          <a href="https://docs.openstack.org/horizon/latest/admin/admin-manage-roles.html"
             target="_blank"
             class="orange--text text--darken-2">
            Openstack help section<v-icon style="font-size:80%">mdi-open-in-new</v-icon></a> on how to create and manage roles.
        </p>

      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn class="orange--text text--darken-2" flat @click.native.stop="visible = false">
          Got it
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  export default {
    props: {
      value: {
        type: Boolean,
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
    },
    methods: {
    }
  }
</script>



<style lang="styl" scoped>

  .card__title{
    background-image: url(../assets/openstack_background.svg);
    background-size: cover;
    color:white;
    height:90px;
    span{
      font-size:24px
      padding-left:10px
      font-weight:400
    }
  }

  .helpContent {
    a {
      text-decoration: none;
    }
    h1 {
      font-size:22px;
      font-weight:400;
    }
    p {
      font-size:16px
      font-weight:300;
    }
  }

</style>
