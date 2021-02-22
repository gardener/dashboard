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
    @dialog-closed="onDialogClosed()"
    >
    <template v-slot:caption>About</template>
    <template v-slot:message>
      <div class="d-flex flex-row align-center mt-3">
        <img src="../../assets/logo.svg" class="logo mr-3">
        <div>
          <h2 class="mb-1">Gardener Dashboard</h2>
        </div>
      </div>
      <v-divider class="my-3"></v-divider>
      <div class="grey--text text--darken-1">
        <div class="font-weight-bold">Version Information</div>
        <div v-if="!!dashboardVersion">Dashboard {{dashboardVersion}}</div>
        <div v-if="!!gardenerVersion">API {{gardenerVersion}}</div>
        <v-divider v-if="gardenerExtensionsList.length" class="my-3"></v-divider>
        <div v-if="gardenerExtensionsList.length" class="font-weight-bold">Extensions ({{gardenerExtensionsList.length}} deployed)</div>
        <div
        v-for="extension in gardenerExtensionsList"
        :key="extension.id"
        class="extension-item">
          <span>{{extension.name}}</span>
          <span v-if="!!extension.version"> {{extension.version}}</span>
          <span v-if="!!extension.kind"> (Kind: {{extension.kind}})</span>
        </div>
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
  props: {
    value: {
      type: Boolean
    }
  },
  data () {
    return {
      gardenerVersion: undefined,
      dashboardVersion: undefined
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
    },
    async fetchExtensions () {
      if (this.isAdmin) {
        await this.fetchGardenerExtensions()
      }
    },
    onDialogClosed () {
      this.$emit('dialog-closed')
    }
  },
  watch: {
    value (value) {
      if (value) {
        this.$refs.gDialog.showDialog()
        this.fetchVersions()
        this.fetchExtensions()
      }
    }
  }
}

</script>

<style lang="scss" scoped>
  .logo {
    height: 50px;
  }
</style>
