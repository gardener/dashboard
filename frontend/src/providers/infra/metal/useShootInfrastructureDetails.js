//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useMetalConstraints } from '@/providers/infra/metal/cloudProfile'

import find from 'lodash/find'
import get from 'lodash/get'
import head from 'lodash/head'
import map from 'lodash/map'
import set from 'lodash/set'

export function createMetalInfrastructureDetailsContext ({
  manifest,
  region,
  cloudProfile,
}) {
  const {
    useMetalPartitionIDs,
    metalFirewallImages,
    useMetalFirewallSizes,
    useMetalFirewallNetworks,
  } = useMetalConstraints(cloudProfile)

  const partitionIDs = useMetalPartitionIDs(region)
  const sizes = useMetalFirewallSizes(region)
  const firewallSizes = computed(() => map(sizes.value, 'name'))
  const firewallImages = metalFirewallImages

  const projectID = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'projectID'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'projectID'], value)
    },
  })

  const firewallImage = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'image'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'image'], value)
    },
  })

  const firewallSize = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'size'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'size'], value)
    },
  })

  const firewallNetworks = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'networks'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'networks'], value)
    },
  })

  const partitionID = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'partitionID'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'partitionID'], value)
      resetFirewallSize()
      resetFirewallNetworks()
    },
  })

  const allFirewallNetworks = useMetalFirewallNetworks(partitionID)

  function resetFirewallSize () {
    firewallSize.value = head(firewallSizes.value)
  }

  function resetFirewallNetworks () {
    const internetFirewallNetwork = find(allFirewallNetworks.value, ['key', 'internet'])
    firewallNetworks.value = internetFirewallNetwork
      ? [internetFirewallNetwork.value]
      : undefined
  }

  function resetRegionDependentValues () {
    partitionID.value = head(partitionIDs.value)
  }

  function resetCloudProfileDependentValues () {
    projectID.value = undefined
    firewallImage.value = head(firewallImages.value)
  }

  return {
    projectID,
    partitionID,
    firewallImage,
    firewallSize,
    firewallNetworks,
    partitionIDs,
    firewallImages,
    firewallSizes,
    allFirewallNetworks,
    resetRegionDependentValues,
    resetCloudProfileDependentValues,
  }
}
