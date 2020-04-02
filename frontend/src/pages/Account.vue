<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-container grid-list-lg fluid>
    <v-layout row wrap>
      <v-flex md6 xs12>
        <v-card>
          <v-toolbar card class="teal darken-1" dark>
            <v-icon class="white--text pr-2">{{icon}}</v-icon>
            <v-toolbar-title>User Details</v-toolbar-title>
            <v-spacer></v-spacer>
            <copy-btn
              :clipboard-text="idToken"
              tooltip-text="Copy ID Token to clipboard"
              copy-success-text="Copied ID Token to clipboard!">
            </copy-btn>
          </v-toolbar>
          <v-card-text>
            <v-layout row wrap>
              <v-flex xs12>
                <label class="caption grey--text text--darken-2">Name</label>
                <p class="pt-2">
                  <account-avatar :account-name="username" mailTo :size="32"/>
                </p>
              </v-flex>
              <v-flex v-if="!!fullDisplayName" md6 xs12>
                <label class="caption grey--text text--darken-2">Display Name</label>
                <p class="subheading">{{fullDisplayName}}</p>
              </v-flex>
              <v-flex xs12>
                <label class="caption grey--text text--darken-2">Groups</label>
                <p>
                  <v-chip v-for="(group, index) in groups" :key="index" label small outline disabled color="black">{{group}}</v-chip>
                </p>
              </v-flex>
              <v-flex xs12>
                <label class="caption grey--text text--darken-2">Session Expiration</label>
                <p class="subheading">{{expiresAt}}</p>
              </v-flex>
            </v-layout>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-flex md6 xs12>
        <v-card >
          <v-toolbar card class="teal darken-1" dark>
            <v-icon class="white--text pr-2">insert_drive_file</v-icon>
            <v-toolbar-title>Kubeconfig</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-layout row wrap>
              <v-flex xs12>
                 The downloaded kubeconfig will use <a href="https://github.com/int128/kubelogin"><tt>kubelogin</tt></a>, also known as <tt>kubectl oidc-login</tt>.
                 for login into the garden cluster. Below you can configure some of command line arguments of <tt>kubelogin</tt>.
              </v-flex>
              <v-flex xs12 d-flex>
                <v-select
                  color="teal darken-1"
                  v-model="projectName"
                  :items="projectNames"
                  label="Project"
                  hint="The namespace of the project will be the namespace of the <tt>current-context</tt>"
                  persistent-hint
                ></v-select>
              </v-flex>
              <v-flex xs12 d-flex>
                <v-select
                  color="teal darken-1"
                  v-model="grantType"
                  :items="grantTypes"
                  label="Grant Type"
                  hint="The authorization grant type to use"
                  persistent-hint
                ></v-select>
              </v-flex>
              <v-flex xs12 d-flex>
                <v-switch
                  color="teal darken-1"
                  v-model="skipOpenBrowser"
                  label="Skip Open Browser"
                  hint="If true, it does not open the browser on authentication"
                  persistent-hint
                ></v-switch>
              </v-flex>
            </v-layout>
          </v-card-text>
          <v-card-actions class="grey lighten-4 mt-2">
            <div class="ma-1">
              <v-tooltip top>
                <v-btn flat color="grey darken-4" slot="activator" @click="onDownload">
                  Download
                </v-btn>
                <span>Download Kubeconfig</span>
              </v-tooltip>
            </div>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import download from 'downloadjs'
import AccountAvatar from '@/components/AccountAvatar'
import { getToken } from '@/utils/api'
import { mapState, mapGetters } from 'vuex'
import moment from 'moment-timezone'
import map from 'lodash/map'
import find from 'lodash/find'

// js-yaml
import jsyaml from 'js-yaml'

function safeDump (value) {
  return jsyaml.safeDump(value, {
    skipInvalid: true
  })
}

export default {
  components: {
    CopyBtn,
    AccountAvatar
  },
  name: 'profile',
  data () {
    return {
      projectName: undefined,
      skipOpenBrowser: false,
      grantType: 'auto',
      grantTypes: [ 'auto', 'authcode', 'authcode-keyboard' ],
      idToken: undefined,
      showToken: false,
      floatingButton: false,
      showMessage: false
    }
  },
  async mounted () {
    try {
      const project = find(this.projectList, ['metadata.namespace', this.namespace])
      if (project) {
        this.projectName = project.metadata.name
      }
      const { data } = await getToken()
      this.idToken = data.token
    } catch (err) {
      console.error(err.message)
    }
  },
  computed: {
    ...mapState([
      'user',
      'namespace',
      'cfg'
    ]),
    ...mapGetters([
      'username',
      'projectList',
      'fullDisplayName',
      'isAdmin',
      'canCreateProject'
    ]),
    icon () {
      return this.isAdmin ? 'supervisor_account' : 'mdi-account'
    },
    id () {
      return this.user.id
    },
    groups () {
      return this.user.groups
    },
    expiresAt () {
      return moment.duration(this.user.exp - Math.floor(Date.now() / 1000), 'seconds').humanize(true)
    },
    projectNames () {
      return map(this.projectList, 'metadata.name')
    },
    kubeconfig () {
      const project = find(this.projectList, ['metadata.name', this.projectName])
      const name = 'garden-' + project.metadata.name
      const namespace = project.metadata.namespace
      const {
        server,
        certificateAuthorityData,
        oidc: {
          issuerUrl,
          clientId,
          clientSecret,
          extraScopes = []
        }
      } = this.cfg.kubeconfig
      const cluster = {
        'certificate-authority-data': certificateAuthorityData,
        server
      }
      const context = {
        cluster: name,
        user: 'oidc-login'
      }
      if (namespace) {
        context.namespace = namespace
      }
      const args = [
        'oidc-login',
        'get-token',
        '--oidc-issuer-url=' + issuerUrl,
        '--oidc-client-id=' + clientId,
        '--oidc-client-secret=' + clientSecret
      ]
      for (const scope of extraScopes) {
        args.push('--oidc-extra-scope=' + scope)
      }
      args.push('--grant-type=' + this.grantType)
      if (this.skipOpenBrowser) {
        args.push('--skip-open-browser')
      }
      const user = {
        exec: {
          apiVersion: 'client.authentication.k8s.io/v1beta1',
          command: 'kubectl',
          args
        }
      }
      return {
        kind: 'Config',
        apiVersion: 'v1',
        clusters: [{
          name,
          cluster
        }],
        contexts: [{
          context,
          name
        }],
        'current-context': name,
        users: [{
          name: 'oidc-login',
          user
        }],
        preferences: {}
      }
    }
  },
  methods: {
    onDownload () {
      const filename = `kubeconfig-garden-${this.projectName}.yaml`
      const data = safeDump(this.kubeconfig)
      download(data, filename, 'text/yaml')
    }
  }
}
</script>
