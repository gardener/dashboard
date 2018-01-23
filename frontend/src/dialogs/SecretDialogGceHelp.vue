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
      <v-card-title class="green white--text darken-2">
        <v-icon large class="white--text ml-3">mdi-help-circle-outline</v-icon>
        <span>About GCP Service Accounts</span>
      </v-card-title>
      <v-card-text class="helpContent">
        <p>
          A service account is a special account that can be used by services and applications running on your Google
          Compute Engine instance to interact with other Google Cloud Platform APIs. Applications can use service
          account credentials to authorize themselves to a set of APIs and perform actions within the permissions
          granted to the service account and virtual machine instance.
        </p>

        <p>
          Ensure that the service account has at least the roles below.
          <ul>
            <li>Service Account Admin</li>
            <li>Service Account Actor</li>
            <li>Compute Admin</li>
          </ul>

        </p>

        <p>
          The Service Account has to be enabled for the Google Identity and Access Management API.
          Currently also the Service Account of the Gardener
          <code>kubeoperator@sap-cloud-platform-dev1.iam.gserviceaccount.com</code>
          needs the following role in your GCP project:
          <ul>
            <li>Compute Admin</li>
          </ul>
        </p>

        <p>
          Read the
          <a href="https://cloud.google.com/compute/docs/access/service-accounts"
             target="_blank"
             class="green--text text--darken-2">
            Service Account Documentation<v-icon style="font-size:80%">mdi-open-in-new</v-icon></a> on how to apply for credentials
          to service accounts.
        </p>

      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn class="green--text" flat @click.native.stop="visible = false">
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
    background-image: url(../assets/gce_background.svg);
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
    ul {
      margin-top:20px;
      margin-bottom:20px;
      list-style-type: none;
      border-left:4px solid #318334 !important;
      margin-left:20px;
      padding-left:24px;
      li {
        font-weight:300;
        font-size:16px;
      }
    }
  }

</style>
