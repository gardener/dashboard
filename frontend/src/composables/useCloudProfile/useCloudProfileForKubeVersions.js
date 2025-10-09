import semver from 'semver'
import {
  computed,
  isRef,
} from 'vue'

import { useLogger } from '@/composables/useLogger.js'
import {
  decorateClassificationObject,
  firstItemMatchingVersionClassification,
} from '@/composables/helper.js'

import {
  isValidTerminationDate,
  UNKNOWN_EXPIRED_TIMESTAMP,
} from '@/utils/index.js'

import get from 'lodash/get'
import filter from 'lodash/filter'
import map from 'lodash/map'
import some from 'lodash/some'
import find from 'lodash/find'

/**
 * @typedef {import('vue').ComputedRef} ComputedRef
 */

/**
 * Composable for managing Kubernetes version information from a cloud profile.
 * Provides computed properties and functions for working with Kubernetes versions,
 * including version sorting, updates, expiration tracking, and update path validation.
 *
 * @param {Ref<object>} cloudProfile - A Vue ref containing the cloud profile object
 * @throws {Error} If cloudProfile is not a ref
 */
export function useCloudProfileForKubeVersions (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const logger = useLogger()
  const availableKubernetesUpdatesCache = new Map()

  const kubernetesVersions = computed(() => {
    const allVersions = get(cloudProfile.value, ['spec', 'kubernetes', 'versions'], [])
    const validVersions = filter(allVersions, ({ version }) => {
      if (!semver.valid(version)) {
        logger.info(`Skipped Kubernetes version ${version} as it is not a valid semver version`)
        return false
      }
      return true
    })
    return map(validVersions, decorateClassificationObject)
  })

  const sortedKubernetesVersions = computed(() => {
    return kubernetesVersions.value.toSorted((a, b) => {
      return semver.rcompare(a.version, b.version)
    })
  })

  const defaultKubernetesVersion = computed(() => {
    const k8sVersions = sortedKubernetesVersions.value
    return firstItemMatchingVersionClassification(k8sVersions)
  })

  /**
   * Returns available Kubernetes updates for a given shoot version.
   * Groups updates by semver diff type (patch, minor, major) and filters out expired versions.
   * Results are cached for performance.
   *
   * @param {Ref<string>} shootVersion - A Vue ref containing the current shoot Kubernetes version
   * @returns {ComputedRef<object|null>} Computed ref with available updates grouped by diff type (patch/minor/major), or null if no updates
   * @throws {Error} If shootVersion is not a ref
   */
  function availableKubernetesUpdatesForShoot (shootVersion) {
    return computed(() => {
      if (!isRef(shootVersion)) {
        throw Error('shootversion must be a ref!')
      }
      const key = `${shootVersion.value}_${cloudProfile.value.kind}_${cloudProfile.value.name}`
      let newerVersions = availableKubernetesUpdatesCache.get(key)
      if (newerVersions !== undefined) {
        return newerVersions
      }
      newerVersions = {}
      const allVersions = kubernetesVersions.value

      const validVersions = filter(allVersions, ({ isExpired }) => !isExpired)
      const newerVersionsForShoot = filter(validVersions, ({ version }) => semver.gt(version, shootVersion.value))
      for (const version of newerVersionsForShoot) {
        const diff = semver.diff(version.version, shootVersion.value)
        /* eslint-disable security/detect-object-injection */
        if (!newerVersions[diff]) {
          newerVersions[diff] = []
        }
        newerVersions[diff].push(version)
        /* eslint-enable security/detect-object-injection */
      }
      newerVersions = newerVersionsForShoot.length ? newerVersions : null
      availableKubernetesUpdatesCache.set(key, newerVersions)

      return newerVersions
    })
  }

  /**
   * Checks if the given Kubernetes version is not the latest patch version.
   * Compares against all supported versions in the same minor version range.
   *
   * @param {Ref<string>} kubernetesVersion - A Vue ref containing the Kubernetes version to check
   * @returns {ComputedRef<boolean>} Computed ref that is true if a newer supported patch version exists
   * @throws {Error} If kubernetesVersion is not a ref
   */
  function kubernetesVersionIsNotLatestPatch (kubernetesVersion) {
    return computed(() => {
      if (!isRef(kubernetesVersion)) {
        throw Error('kubernetesVersion must be a ref!')
      }
      const allVersions = kubernetesVersions.value
      return some(allVersions, ({ version, isSupported }) => {
        return semver.diff(version, kubernetesVersion.value) === 'patch' && semver.gt(version, kubernetesVersion.value) && isSupported
      })
    })
  }

  /**
   * Checks if an update path is available for the given Kubernetes version.
   * An update path exists if:
   * - A newer patch version is available, OR
   * - The next minor version exists AND a newer supported minor version exists
   *
   * @param {Ref<string>} kubernetesVersion - A Vue ref containing the Kubernetes version to check
   * @returns {ComputedRef<boolean>} Computed ref that is true if an update path is available
   * @throws {Error} If kubernetesVersion is not a ref
   */
  function kubernetesVersionUpdatePathAvailable (kubernetesVersion) {
    return computed(() => {
      if (!isRef(kubernetesVersion)) {
        throw Error('kubernetesVersion must be a ref!')
      }

      const allVersions = kubernetesVersions.value
      if (kubernetesVersionIsNotLatestPatch(kubernetesVersion).value) {
        return true
      }

      const nextMinorVersion = semver.minor(kubernetesVersion.value) + 1
      let hasNextMinorVersion = false
      let hasNewerSupportedMinorVersion = false

      for (const { version, isSupported } of allVersions) {
        const minorVersion = semver.minor(version)
        if (minorVersion === nextMinorVersion) {
          // we can only upgrade one version at a time, therefore we only check if the next version exists
          // as for the current upgrade this is the only relevant version
          hasNextMinorVersion = true
        }
        if (minorVersion >= nextMinorVersion && isSupported) {
          // if no newer supported exists (no need to be next minor) there is no update path
          // this will result in an error in case the current version is about to expire
          // we show this as error information to the user (this should not happen, likely a misconfiguration)
          hasNewerSupportedMinorVersion = true
        }
      }

      return hasNextMinorVersion && hasNewerSupportedMinorVersion
    })
  }

  /**
   * Calculates the expiration information and severity for a shoot's Kubernetes version.
   * Takes into account the version's expiration date, auto-patch settings, and available updates.
   *
   * @param {Ref<string>} shootK8sVersion - A Vue ref containing the shoot's Kubernetes version
   * @param {Ref<boolean>} k8sAutoPatch - A Vue ref indicating if auto-patching is enabled
   * @returns {ComputedRef<object|undefined>} Computed ref with expiration info, or undefined if no warning needed
   * @returns {string} returns.expirationDate - ISO 8601 expiration date string or UNKNOWN_EXPIRED_TIMESTAMP
   * @returns {boolean} returns.isExpired - Whether the version has expired
   * @returns {boolean} returns.isValidTerminationDate - Whether the expiration date is valid
   * @returns {string} returns.severity - Severity level: 'info', 'warning', or 'error'
   * @throws {Error} If shootK8sVersion or k8sAutoPatch are not refs
   */
  function kubernetesVersionExpirationForShoot (shootK8sVersion, k8sAutoPatch) {
    return computed(() => {
      if (!isRef(shootK8sVersion) && !isRef(k8sAutoPatch)) {
        throw Error('shootK8sVersion and k8sAutoPatch must be a ref!')
      }

      const allVersions = kubernetesVersions.value
      const version = find(allVersions, { version: shootK8sVersion.value })
      if (!version) {
        return {
          version: shootK8sVersion.value,
          expirationDate: UNKNOWN_EXPIRED_TIMESTAMP,
          isValidTerminationDate: false,
          severity: 'warning',
        }
      }

      const patchAvailable = kubernetesVersionIsNotLatestPatch(shootK8sVersion)
      const updatePathAvailable = kubernetesVersionUpdatePathAvailable(shootK8sVersion)

      function getVersionExpirationWarningSeverity (options) {
        const {
          isExpirationWarning,
          autoPatchEnabled,
          updateAvailable,
          autoUpdatePossible,
        } = options
        const autoPatchEnabledAndPossible = autoPatchEnabled && autoUpdatePossible
        if (!isExpirationWarning) {
          return autoPatchEnabledAndPossible
            ? 'info'
            : undefined
        }
        if (!updateAvailable) {
          return 'error'
        }
        return 'warning'
      }

      const severity = getVersionExpirationWarningSeverity({
        isExpirationWarning: version.isExpirationWarning,
        autoPatchEnabled: k8sAutoPatch.value,
        updateAvailable: updatePathAvailable.value,
        autoUpdatePossible: patchAvailable.value,
      })

      if (!severity) {
        return undefined
      }

      return {
        expirationDate: version.expirationDate,
        isExpired: version.isExpired,
        isValidTerminationDate: isValidTerminationDate(version.expirationDate),
        severity,
      }
    })
  }

  return {
    kubernetesVersions,
    sortedKubernetesVersions,
    defaultKubernetesVersion,
    availableKubernetesUpdatesForShoot,
    kubernetesVersionIsNotLatestPatch,
    kubernetesVersionUpdatePathAvailable,
    kubernetesVersionExpirationForShoot,
  }
}
