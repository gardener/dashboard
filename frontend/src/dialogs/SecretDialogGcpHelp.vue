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

 <template>
   <secret-dialog-help
     title="About GCP Service Accounts"
     color="green"
     backgroundSrc="/static/background_gcp.svg"
     :value="value"
     @input="onInput">
     <div slot="help-content" class="helpContent">
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
          <li>Service Account Token Creator</li>
          <li>Service Account User</li>
          <li>Compute Admin</li>
        </ul>

      </p>

      <p>
        The Service Account has to be enabled for the Google Identity and Access Management API.
      </p>

      <p>
        Read the
        <a href="https://cloud.google.com/compute/docs/access/service-accounts"
           target="_blank"
           class="green--text text--darken-2">
          Service Account Documentation<v-icon style="font-size:80%">mdi-open-in-new</v-icon></a> on how to apply for credentials
        to service accounts.
      </p>
    </div>
  </secret-dialog-help>
</template>

<script>
import SecretDialogHelp from '@/dialogs/SecretDialogHelp'
export default {
  components: {
    SecretDialogHelp
  },
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    }
  }
}
</script>

<style lang="styl" scoped>

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
