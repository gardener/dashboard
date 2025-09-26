//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const DEFAULT_BASE_PATH = '/static/assets'
const CUSTOM_BASE_PATH = '/static/custom-assets'
const LINK_ATTRIBUTE = 'data-asset-key'

const DEFAULT_FILES = {
  productLogo: 'logo.svg',
  favicon: 'favicon.ico',
  favicon16: 'favicon-16x16.png',
  favicon32: 'favicon-32x32.png',
  favicon96: 'favicon-96x96.png',
}

function normalizeAssetConfig (value) {
  if (!value) {
    return {}
  }
  if (typeof value === 'string') {
    return { fileName: value }
  }
  if (typeof value === 'object') {
    const result = {}
    if (typeof value.fileName === 'string' && value.fileName.trim().length > 0) {
      result.fileName = value.fileName.trim()
    }
    if (value.version !== undefined && value.version !== null) {
      const version = String(value.version).trim()
      if (version) {
        result.version = version
      }
    }
    return result
  }
  return {}
}

function buildAssetUrl (defaultFileName, assetConfig = {}) {
  const { fileName, version } = assetConfig
  const basePath = fileName ? CUSTOM_BASE_PATH : DEFAULT_BASE_PATH
  const finalFileName = fileName || defaultFileName
  let url = `${basePath}/${encodeURIComponent(finalFileName)}`
  if (version) {
    const separator = url.includes('?') ? '&' : '?'
    url += `${separator}v=${encodeURIComponent(version)}`
  }
  return url
}

function createBrandingAssetUrls (assets = {}) {
  const productLogoConfig = normalizeAssetConfig(assets.productLogo)
  const faviconConfig = normalizeAssetConfig(assets.favicon)
  const favicon16Config = normalizeAssetConfig(assets.favicon16)
  const favicon32Config = normalizeAssetConfig(assets.favicon32)
  const favicon96Config = normalizeAssetConfig(assets.favicon96)
  return {
    productLogo: buildAssetUrl(DEFAULT_FILES.productLogo, productLogoConfig),
    favicon: buildAssetUrl(DEFAULT_FILES.favicon, faviconConfig),
    favicon16: buildAssetUrl(DEFAULT_FILES.favicon16, favicon16Config),
    favicon32: buildAssetUrl(DEFAULT_FILES.favicon32, favicon32Config),
    favicon96: buildAssetUrl(DEFAULT_FILES.favicon96, favicon96Config),
  }
}

function applyBrandingAssetLinks (assetUrls = {}) {
  if (typeof document === 'undefined') {
    return
  }
  const linkEntries = [
    ['favicon', assetUrls.favicon],
    ['favicon16', assetUrls.favicon16],
    ['favicon32', assetUrls.favicon32],
    ['favicon96', assetUrls.favicon96],
  ]
  for (const [key, url] of linkEntries) {
    if (!url) {
      continue
    }
    const selector = `[${LINK_ATTRIBUTE}="${key}"]`
    const links = document.querySelectorAll(selector)
    for (const link of links) {
      link.setAttribute('href', url)
    }
  }
}

export {
  createBrandingAssetUrls,
  applyBrandingAssetLinks,
}
