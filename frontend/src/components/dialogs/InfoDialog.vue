<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

 <template>
  <g-dialog
    ref="gDialog"
    confirm-button-text="Ok"
    cancel-button-text=""
    maxWidth="600"
    >
    <template v-slot:caption>About Gardener Dashboard</template>
    <template v-slot:message>
      <div class="d-flex flex-row align-center mt-3">
        <img src="../../assets/logo.svg" class="logo mr-3">
        <div>
          <h1 class="mb-1">Gardener Dashboard</h1>
          <h2>Web-based GUI for the Gardener.</h2>
        </div>
      </div>
      <v-divider class="my-3"></v-divider>
      <div class="grey--text text--darken-1">
        <div class="font-weight-bold">Version Information</div>
        <div v-if="!retrievedVersions"><v-progress-circular size="12" width="1" class="mr-1" indeterminate ></v-progress-circular>Retrieving versions...</div>
        <div v-if="!!dashboardVersion">Dashboard version {{dashboardVersion}}</div>
        <div v-if="!!gardenerVersion">API version {{gardenerVersion}}</div>
        <div v-if="!retrievedExtensions"><v-progress-circular size="12" width="1" class="mr-1" indeterminate ></v-progress-circular>Retrieving extensions...</div>
        <v-expansion-panels v-else-if="gardenerExtensionsList.length && isAdmin" flat>
          <v-expansion-panel class="grey--text text--darken-1">
            <v-expansion-panel-header class="text-body-2 pa-0">
              {{gardenerExtensionsList.length}} deployed Extensions
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <div
              v-for="extension in gardenerExtensionsList"
              :key="extension.id"
              class="extension-item">
                <span class="font-weight-bold">{{extension.name}}</span>
                <span v-if="!!extension.version"> | Version: {{extension.version}}</span>
                <span v-if="!!extension.kind"> | Kind: {{extension.kind}}</span>
              </div>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
      <v-divider class="my-3"></v-divider>
      <div class="grey--text">
        <span class="font-weight-bold">Gardener Dashboard</span><br />
        Copyright 2021 SAP SE or an SAP affiliate company and Gardener contributors<br />
        Github Project: <a href="https://github.com/gardener/dashboard" target="_blank">github.com/gardener/dashboard <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a><br />
        License: <a href="https://github.com/gardener/dashboard/blob/master/LICENSES/Apache-2.0.txt" target="_blank">Apache License Version 2.0 <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>
      </div>
    </template>
  </g-dialog>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import GDialog from '@/components/dialogs/GDialog'
import { getInfo } from '@/utils/api'

export default {
  name: 'info-dialog',
  components: {
    GDialog
  },
  data () {
    return {
      gardenerVersion: undefined,
      dashboardVersion: undefined,
      retrievedVersions: false,
      retrievedExtensions: false
    }
  },
  computed: {
    ...mapGetters([
      'isAdmin',
      'gardenerExtensionsList'
    ])
  },

  methods: {
    ...mapActions([
      'fetchGardenerExtensions',
      'setError'
    ]),
    showDialog () {
      this.$refs.gDialog.showDialog()
    },
    async fetchVersions () {
      try {
        const {
          data: {
            gardenerVersion,
            version
          } = {}
        } = await getInfo()
        if (gardenerVersion) {
          this.gardenerVersion = gardenerVersion.gitVersion
        }
        if (version) {
          this.dashboardVersion = `${version}`
        }
      } catch (err) {
        this.setError({
          message: `Failed to fetch version information. ${err.message}`
        })
      }
      this.retrievedVersions = true
    },
    async fetchExtensions () {
      await this.fetchGardenerExtensions()
      this.retrievedExtensions = true
    }
  }
}

</script>

<style lang="scss" scoped>
  .logo {
    height: 50px;
  }
</style>
