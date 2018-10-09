<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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

<template >
  <v-dialog v-model="visible" max-width="650">
    <v-card class="help_member" :class="cardClass">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-account-plus</v-icon>
        <span v-if="isUserDialog">Project Members</span>
        <span v-if="isServiceDialog">Service Accounts</span>
      </v-card-title>
      <v-card-text>
        <template v-if="isUserDialog">
          <div class="title grey--text text--darken-1 my-3">Add members to your project.</div>
          <p class="body-1">
            Adding members to your project allows you to collaborate across your team.
            Project members have full access to all resources within your project.
          </p>
        </template>
        <template v-if="isServiceDialog">
          <div class="title grey--text text--darken-1 my-3">Add service accounts to your project.</div>
          <p class="body-1">
            Adding service accounts to your project allows you to automate processes in your project.
            Service accounts have full access to all resources within your project.
          </p>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.stop="hide" :class="buttonClass" tabindex="2">Ok</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  export default {
    name: 'help-member-dialog',
    props: {
      value: {
        type: Boolean,
        required: true
      },
      type: {
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
      },
      isUserDialog () {
        return this.type === 'user'
      },
      isServiceDialog () {
        return this.type === 'service'
      },
      cardClass () {
        if (this.isUserDialog) {
          return 'help_user'
        } else if (this.isServiceDialog) {
          return 'help_service'
        }
        return ''
      },
      buttonClass () {
        if (this.isUserDialog) {
          return 'green--text darken-2'
        } else if (this.isServiceDialog) {
          return 'blue-grey--text'
        }
        return ''
      }
    },
    methods: {
      hide () {
        this.visible = false
      }
    }
  }
</script>

<style lang="styl" scoped>
  .help_member {
    .v-card__title{
      background-size: cover;
      color:white;
      height:130px;
      span{
        font-size:25px !important
        padding-left:30px
        font-weight:400 !important
        padding-top:15px !important
      }
      .icon {
        font-size: 50px !important;
      }
    }
  }
  .help_user {
    .v-card__title{
      background-image: url(../assets/add_user_background.svg);
    }
  }
  .help_service {
    .v-card__title{
      background-image: url(../assets/add_service_background.svg);
    }
  }
</style>
