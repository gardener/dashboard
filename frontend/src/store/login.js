//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import { ref } from 'vue'

import { useLogger } from '@/composables/useLogger'

import {
  createBrandingAssetUrls,
  applyBrandingAssetLinks,
} from '@/utils/brandingAssets'

export const useLoginStore = defineStore('login', () => {
  const logger = useLogger()

  const url = import.meta.env.BASE_URL + 'login-config.json'

  const loginError = ref(null)
  const loginType = ref('token')
  const loginTypes = ref(['token'])
  const landingPageUrl = ref('')
  const themes = ref(null)
  const defaultAssetUrls = createBrandingAssetUrls()

  const branding = ref({
    assetUrls: defaultAssetUrls,
    productLogoUrl: defaultAssetUrls.productLogo,
    productName: 'Gardener',
    productSlogan: 'Universal Kubernetes at Scale',
    oidcLoginText: 'Press Login to be redirected to the configured\nOpenID Connect Provider.',
    tokenLoginText: 'Enter a bearer token trusted by the Kubernetes API server and press Login.',
  })

  async function fetchConfig () {
    try {
      const response = await fetch(url, {
        mode: 'no-cors',
        cache: 'no-cache',
      })
      const data = await response.json()
      loginTypes.value = data.loginTypes
      landingPageUrl.value = data.landingPageUrl
      themes.value = data.themes ?? {}
      Object.assign(branding.value, data.branding ?? {})
      const assetUrls = createBrandingAssetUrls(branding.value.assets)
      branding.value.assetUrls = assetUrls
      if (!branding.value.productLogoUrl) {
        branding.value.productLogoUrl = assetUrls.productLogo
      }
      applyBrandingAssetLinks(assetUrls)
      if (branding.value.productTitle === undefined) {
        branding.value.productTitle = branding.value.productName
      }
    } catch (err) {
      logger.error('Failed to fetch login configuration: %s', err.message)
      loginTypes.value = ['token']
    } finally {
      loginType.value = loginTypes.value[0]
    }
  }

  return {
    loginError,
    loginType,
    loginTypes,
    landingPageUrl,
    themes,
    branding,
    fetchConfig,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useLoginStore, import.meta.hot))
}
