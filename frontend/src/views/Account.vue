<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-toolbar flat dark dense class="teal darken-2">
            <v-toolbar-title>Details</v-toolbar-title>
          </v-toolbar>
          <v-list dense>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon color="teal darken-2">{{icon}}</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="label pb-2">User</v-list-item-title>
                <v-list-item-subtitle class="content pb-2">
                  <account-avatar :account-name="username" mail-to color="teal darken-2" :size="32"/>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-list-item v-if="!!fullDisplayName">
              <v-list-item-avatar>
                &nbsp;
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="label">Name</v-list-item-title>
                <v-list-item-subtitle class="content pb-2">
                  {{fullDisplayName}}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-list-item>
              <v-list-item-avatar>
                &nbsp;
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="label">Groups</v-list-item-title>
                <v-list-item-subtitle class="content">
                  <div class="py-1">
                    <v-chip v-for="(group, index) in groups" :key="index" label small class="mr-2">{{group}}</v-chip>
                  </div>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <v-divider inset/>
          <v-list>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon color="teal darken-2">timelapse</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="label">Session</v-list-item-title>
                <v-list-item-subtitle class="content">
                   Expires {{expiresAt}}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-toolbar flat dark dense class="teal darken-2">
            <v-toolbar-title>Access</v-toolbar-title>
          </v-toolbar>
          <v-list>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon color="teal darken-2">mdi-key </v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>Token</v-list-item-title>
                <v-list-item-subtitle>Personal bearer token for API authentication</v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-action>
                <copy-btn :clipboard-text="idToken"></copy-btn>
              </v-list-item-action>
            </v-list-item>
            <template v-if="isKubeconfigEnabled">
              <v-divider inset class="my-2"/>
              <v-list-item>
                <v-list-item-avatar>
                  <v-icon color="teal darken-2">insert_drive_file</v-icon>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title>Kubeconfig</v-list-item-title>
                  <v-list-item-subtitle class="line-clamp-2">Personalized command line interface access (requires <tt>kubelogin</tt> kubectl plugin)</v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action class="mx-0">
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn v-on="on" icon @click.native.stop="onDownload">
                        <v-icon>mdi-download</v-icon>
                      </v-btn>
                    </template>
                    <span>Download kubeconfig</span>
                  </v-tooltip>
                </v-list-item-action>
                <v-list-item-action class="mx-0">
                  <copy-btn :clipboard-text="kubeconfig" tooltipText="Copy kubeconfig to clipboard"></copy-btn>
                </v-list-item-action>
                <v-list-item-action class="mx-0">
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn v-on="on" icon @click.native.stop="expansionPanel = !expansionPanel">
                        <v-icon>{{expansionPanelIcon}}</v-icon>
                      </v-btn>
                    </template>
                    <span>{{expansionPanelTooltip}}</span>
                  </v-tooltip>
                </v-list-item-action>
              </v-list-item>
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
                    <v-tabs slider-color="grey lighten-1" background-color="grey lighten-3" class="mt-2 elevation-1" color="black">
                      <v-tab>Configure</v-tab>
                      <v-tab>Preview</v-tab>
                      <v-tab-item class="pa-4">
                        <v-row >
                          <v-col cols="12">
                            <v-select
                              color="teal darken-1"
                              item-color="teal darken-1"
                              v-model="projectName"
                              :items="projectNames"
                              label="Project"
                              hint="The namespace of the selected project will be the default namespace in the kubeconfig"
                              persistent-hint
                            ></v-select>
                          </v-col>
                          <v-col cols="12">
                            <v-select
                              color="teal darken-1"
                              item-color="teal darken-1"
                              v-model="grantType"
                              :items="grantTypes"
                              label="Grant Type"
                              hint="The authorization grant type to use"
                              persistent-hint
                            ></v-select>
                          </v-col>
                          <v-col cols="12">
                            <v-switch
                              color="teal darken-1"
                              v-model="skipOpenBrowser"
                              label="Skip Open Browser"
                              hint="If true, it does not open the browser on authentication"
                              persistent-hint
                            ></v-switch>
                          </v-col>
                        </v-row>
                      </v-tab-item>
                      <v-tab-item>
                        <code-block lang="yaml" :content="kubeconfig" :show-copy-button="false"></code-block>
                      </v-tab-item>
                    </v-tabs>
                  </v-card-text>
                </v-card>
              </v-expand-transition>
            </template>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
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
      grantTypes: ['auto', 'authcode', 'authcode-keyboard'],
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
      'cfg',
      'kubeconfigData'
    ]),
    ...mapGetters([
      'username',
      'projectList',
      'fullDisplayName',
      'isAdmin',
      'canCreateProject',
      'isKubeconfigEnabled'
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
        insecureSkipTlsVerify,
        oidc = {}
      } = this.kubeconfigData || {}
      const cluster = {
        server
      }
      if (certificateAuthorityData) {
        cluster['certificate-authority-data'] = certificateAuthorityData
      } else if (insecureSkipTlsVerify) {
        cluster['insecure-skip-tls-verify'] = true
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
        '--oidc-issuer-url=' + oidc.issuerUrl,
        '--oidc-client-id=' + oidc.clientId,
        '--oidc-client-secret=' + oidc.clientSecret
      ]
      if (Array.isArray(oidc.extraScopes)) {
        for (const scope of oidc.extraScopes) {
          args.push('--oidc-extra-scope=' + scope)
        }
      }
      if (oidc.certificateAuthorityData) {
        args.push('--certificate-authority-data=' + oidc.certificateAuthorityData)
      } else if (oidc.insecureSkipTlsVerify) {
        args.push('--insecure-skip-tls-verify')
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
      download(this.kubeconfig, this.kubeconfigFilename, 'text/yaml')
    }
  }
}
</script>

<style lang="scss" scoped>
  .label {
    font-size: 14px !important;
    font-weight: 400 !important;
    color: rgba(0,0,0,0.54) !important;
  }
  .content {
    font-size: 16px !important;
    font-weight: 400 !important;
    color: inherit !important;
  }
  .line-clamp-2 {
    white-space: initial;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
</style>
