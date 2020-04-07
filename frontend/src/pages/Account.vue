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
      <v-flex xs12 md6>
        <v-card>
          <v-toolbar card dark dense class="teal darken-2">
            <v-toolbar-title>Details</v-toolbar-title>
          </v-toolbar>
          <v-list two-line class="no-height">
            <v-list-tile>
              <v-list-tile-avatar>
                <v-icon color="teal darken-2">{{icon}}</v-icon>
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title class="label pb-2">User</v-list-tile-title>
                <v-list-tile-sub-title class="content pb-2">
                  <account-avatar :account-name="username" mailTo color="teal darken-2" :size="32"/>
                </v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
            <v-list-tile v-if="!!fullDisplayName">
              <v-list-tile-avatar>
                &nbsp;
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title class="label">Name</v-list-tile-title>
                <v-list-tile-sub-title class="content pb-2">
                  {{fullDisplayName}}
                </v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
            <v-list-tile>
              <v-list-tile-avatar>
                &nbsp;
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title class="label">Groups</v-list-tile-title>
                <v-list-tile-sub-title class="content">
                  <span style="margin-left: -4px">
                    <v-chip v-for="(group, index) in groups" :key="index" label small outline disabled color="black">{{group}}</v-chip>
                  </span>
                </v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
            <v-divider inset class="my-2"/>
            <v-list-tile>
              <v-list-tile-avatar>
                <v-icon color="teal darken-2">timelapse</v-icon>
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title class="label">Session</v-list-tile-title>
                <v-list-tile-sub-title class="content">
                   Expires {{expiresAt}}
                </v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
          </v-list>
        </v-card>
      </v-flex>
      <v-flex xs12 md6>
        <v-card>
          <v-toolbar card dark dense class="teal darken-2">
            <v-toolbar-title>Access</v-toolbar-title>
          </v-toolbar>
          <v-list>
            <v-list-tile>
              <v-list-tile-avatar>
                <v-icon color="teal darken-2">mdi-key </v-icon>
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title>Token</v-list-tile-title>
                <v-list-tile-sub-title>Personal bearer token for API authentication</v-list-tile-sub-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <copy-btn :clipboard-text="idToken"></copy-btn>
              </v-list-tile-action>
            </v-list-tile>
            <v-divider inset class="my-2"/>
            <v-list-tile>
              <v-list-tile-avatar>
                <v-icon color="teal darken-2">insert_drive_file</v-icon>
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title>Kubeconfig</v-list-tile-title>
                <v-list-tile-sub-title>Personalized command line interface access</v-list-tile-sub-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <v-tooltip top>
                  <v-btn slot="activator" icon @click.native.stop="onDownload">
                    <v-icon>mdi-download</v-icon>
                  </v-btn>
                  <span>Download kubeconfig</span>
                </v-tooltip>
              </v-list-tile-action>
              <v-list-tile-action>
                <copy-btn :clipboard-text="kubeconfig" tooltipText="Copy kubeconfig to clipboard"></copy-btn>
              </v-list-tile-action>
              <v-list-tile-action>
                <v-tooltip top>
                  <v-btn slot="activator" icon @click.native.stop="expansionPanel = !expansionPanel">
                    <v-icon>{{expansionPanelIcon}}</v-icon>
                  </v-btn>
                  <span>{{expansionPanelTooltip}}</span>
                </v-tooltip>
              </v-list-tile-action>
            </v-list-tile>
            <v-expand-transition>
              <v-card v-if="expansionPanel" flat class="mx-2 mt-2">
                <v-card-text class="pt-0">
                  <div class="grey--text text--darken-2">
                    The downloaded <tt>kubeconfig</tt> will initiate
                    <external-link url="https://kubernetes.io/docs/reference/access-authn-authz/authentication/#openid-connect-tokens" color="teal darken-2">
                      OIDC
                    </external-link>
                    authentication via <tt>kubelogin</tt>.
                    If not already done, please install <tt>kubelogin</tt>
                    according to the
                    <external-link url="https://github.com/int128/kubelogin#setup" color="teal darken-2">
                      setup instructions
                    </external-link>.
                    For more information please refer to the <tt>kubelogin</tt> documentation.
                    <br>
                    Below you can configure and preview the <tt>kubeconfig</tt> file before download.
                  </div>
                  <v-tabs slider-color="grey lighten-5" color="grey lighten-3" class="mt-2 elevation-1">
                    <v-tab>Configure</v-tab>
                    <v-tab>Preview</v-tab>
                    <v-tab-item class="pa-3">
                      <v-layout row wrap>
                        <v-flex xs12>
                          <v-select
                            color="teal darken-1"
                            v-model="projectName"
                            :items="projectNames"
                            label="Project"
                            hint="The namespace of the selected project will be the default namespace in the kubeconfig"
                            persistent-hint
                          ></v-select>
                        </v-flex>
                        <v-flex xs12>
                          <v-select
                            color="teal darken-1"
                            v-model="grantType"
                            :items="grantTypes"
                            label="Grant Type"
                            hint="The authorization grant type to use"
                            persistent-hint
                          ></v-select>
                        </v-flex>
                        <v-flex xs12>
                          <v-switch
                            color="teal darken-1"
                            v-model="skipOpenBrowser"
                            label="Skip Open Browser"
                            hint="If true, it does not open the browser on authentication"
                            persistent-hint
                          ></v-switch>
                        </v-flex>
                      </v-layout>
                    </v-tab-item>
                    <v-tab-item>
                      <code-block lang="yaml" :content="kubeconfig" :show-copy-button="false"></code-block>
                    </v-tab-item>
                  </v-tabs>
                </v-card-text>
              </v-card>
            </v-expand-transition>
          </v-list>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import ExternalLink from '@/components/ExternalLink'
import download from 'downloadjs'
import AccountAvatar from '@/components/AccountAvatar'
import { getToken } from '@/utils/api'
import { mapState, mapGetters } from 'vuex'
import moment from 'moment-timezone'
import map from 'lodash/map'
import find from 'lodash/find'
import get from 'lodash/get'

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
    CodeBlock,
    ExternalLink,
    AccountAvatar
  },
  name: 'profile',
  data () {
    return {
      expansionPanel: false,
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
      this.projectName = get(project, 'metadata.name', '')
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
    expansionPanelIcon () {
      return this.expansionPanel ? 'expand_less' : 'expand_more'
    },
    expansionPanelTooltip () {
      return this.expansionPanel ? 'Hide advanced options' : 'Show advanced options'
    },
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
      const names = map(this.projectList, 'metadata.name').sort()
      names.unshift('')
      return names
    },
    kubeconfigFilename () {
      if (this.projectName) {
        return `kubeconfig-garden-${this.projectName}.yaml`
      }
      return 'kubeconfig-garden.yaml'
    },
    kubeconfig () {
      const project = find(this.projectList, ['metadata.name', this.projectName])
      const name = 'garden-' + get(project, 'metadata.name', 'none')
      const namespace = get(project, 'metadata.namespace')
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
      return safeDump({
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
      })
    }
  },
  methods: {
    onDownload () {
      let filename = 'kubeconfig-garden'
      if (this.projectName) {
        filename += '-' + this.projectName
      }
      filename += '.yaml'
      download(this.kubeconfig, filename, 'text/yaml')
    }
  }
}
</script>

<style lang="stylus" scoped>
  .no-height >>> [role=listitem] > :first-child {
    height: unset;
    min-height: 48px;
  }
  .label {
    font-size: 14px !important;
    color: rgba(0,0,0,0.54) !important;
  }
  .content {
    font-size: 16px !important;
    font-weight: 400 !important;
    color: inherit !important;
  }
</style>
