//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useOpenStackConstraints } from '@/composables/useCloudProfile/useOpenStackConstraints'

describe('composables', () => {
  describe('useOpenStackConstraints', () => {
    const floatingPools = [
      {
        name: 'global FP',
      },
      {
        name: 'regional FP',
        region: 'region1',
      },
      {
        name: 'regional non constraining FP',
        region: 'region2',
        nonConstraining: true,
      },
      {
        name: 'domain specific FP',
        domain: 'domain1',
      },
      {
        name: 'domain specific non constraining FP',
        domain: 'domain2',
        nonConstraining: true,
      },
      {
        name: 'domain specific, regional FP',
        domain: 'domain3',
        region: 'region3',
      },
      {
        name: 'additional domain specific, regional FP',
        domain: 'domain3',
        region: 'region3',
      },
      {
        name: 'domain specific, regional non constraining FP',
        domain: 'domain4',
        region: 'region4',
        nonConstraining: true,
      },
    ]
    const loadBalancerProviders = [
      {
        name: 'global LB',
      },
      {
        name: 'regional LB',
        region: 'region1',
      },
      {
        name: 'additional regional LB',
        region: 'region1',
      },
      {
        name: 'other regional LB',
        region: 'region2',
      },
    ]

    const loadBalancerClasses = [
      {
        name: 'class1',
      },
      {
        name: 'class2',
      },
    ]

    let cloudProfile

    beforeEach(() => {
      cloudProfile = ref({
        metadata: {
          name: 'foo',
        },
        kind: 'CloudProfile',
        spec: {
          providerConfig: {
            constraints: {
              floatingPools,
              loadBalancerProviders,
              loadBalancerConfig: {
                classes: loadBalancerClasses,
              },
            },
          },
        },
      })
    })

    describe('#useFloatingPoolNames', () => {
      it('should return floating pool names by region and domain from cloud profile', () => {
        const { useFloatingPoolNames } = useOpenStackConstraints(cloudProfile)

        const region = ref('fooRegion')
        const secretDomain = ref('fooDomain')
        let dashboardFloatingPools = useFloatingPoolNames(region, secretDomain).value
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('global FP')

        region.value = 'region1'
        secretDomain.value = 'fooDomain'
        dashboardFloatingPools = useFloatingPoolNames(region, secretDomain).value
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('regional FP')

        region.value = 'region2'
        secretDomain.value = 'fooDomain'
        dashboardFloatingPools = useFloatingPoolNames(region, secretDomain).value
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('regional non constraining FP')

        region.value = 'fooRegion'
        secretDomain.value = 'domain1'
        dashboardFloatingPools = useFloatingPoolNames(region, secretDomain).value
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('domain specific FP')

        region.value = 'fooRegion'
        secretDomain.value = 'domain2'
        dashboardFloatingPools = useFloatingPoolNames(region, secretDomain).value
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('domain specific non constraining FP')

        region.value = 'region3'
        secretDomain.value = 'domain3'
        dashboardFloatingPools = useFloatingPoolNames(region, secretDomain).value
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('domain specific, regional FP')
        expect(dashboardFloatingPools[1]).toBe('additional domain specific, regional FP')

        region.value = 'region4'
        secretDomain.value = 'domain4'
        dashboardFloatingPools = useFloatingPoolNames(region, secretDomain).value
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('domain specific, regional non constraining FP')
      })
    })

    describe('#useLoadBalancerProviderNames', () => {
      it('should return load balancer provider names by region from cloud profile', () => {
        const { useLoadBalancerProviderNames } = useOpenStackConstraints(cloudProfile)

        const region = ref('fooRegion')
        let dashboardLoadBalancerProviderNames = useLoadBalancerProviderNames(region).value
        expect(dashboardLoadBalancerProviderNames).toHaveLength(1)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('global LB')

        region.value = 'region1'
        dashboardLoadBalancerProviderNames = useLoadBalancerProviderNames(region).value
        expect(dashboardLoadBalancerProviderNames).toHaveLength(2)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('regional LB')
        expect(dashboardLoadBalancerProviderNames[1]).toBe('additional regional LB')

        region.value = 'region2'
        dashboardLoadBalancerProviderNames = useLoadBalancerProviderNames(region).value
        expect(dashboardLoadBalancerProviderNames).toHaveLength(1)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('other regional LB')
      })
    })

    describe('#loadBalancerClassNames', () => {
      it('should return load balancer class names from cloud profile', () => {
        const { loadBalancerClassNames } = useOpenStackConstraints(cloudProfile)

        expect(loadBalancerClassNames.value).toHaveLength(2)
        expect(loadBalancerClassNames.value[0]).toBe('class1')
        expect(loadBalancerClassNames.value[1]).toBe('class2')
      })
    })

    describe('#loadBalancerClasses', () => {
      it('should return load balancer classes from cloud profile', () => {
        const { loadBalancerClasses } = useOpenStackConstraints(cloudProfile)

        expect(loadBalancerClasses.value).toHaveLength(2)
        expect(loadBalancerClasses.value[0]).toEqual({ name: 'class1' })
        expect(loadBalancerClasses.value[1]).toEqual({ name: 'class2' })
      })
    })
  })
})
