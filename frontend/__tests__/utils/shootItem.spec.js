//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useShootStore } from '@/store/shoot'
import { useConfigStore } from '@/store/config'

import { useApi } from '@/composables/useApi'

import shootItem from '@/mixins/shootItem'

describe('shootItem mixin', () => {
  let wrapper

  const mountMixinWithShootResource = (shootResource) => {
    const Component = {
      render () { },
      mixins: [shootItem],
    }
    wrapper = shallowMount(Component, {
      propsData: {
        shootItem: shootResource,
      },
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    mountMixinWithShootResource({})
  })

  it('should compute isShootMarkedForDeletion correctly', () => {
    expect(wrapper.vm.isShootMarkedForDeletion).toBe(false)

    const shootResource = {
      metadata: {
        annotations: {
          'confirmation.gardener.cloud/deletion': 'True',
        },
        deletionTimestamp: '2023-01-01T20:57:01Z',
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isShootMarkedForDeletion).toBe(true)
  })

  it('should compute isShootMarkedForForceDeletion correctly', () => {
    expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(false)

    const shootResource = {
      metadata: {
        annotations: {
          'confirmation.gardener.cloud/force-deletion': 'True',
        },
        deletionTimestamp: '2023-01-01T20:57:01Z',
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(true)
    expect(wrapper.vm.isShootMarkedForDeletion).toBe(true)
  })

  it('should compute isShootReconciliationDeactivated correctly', () => {
    expect(wrapper.vm.isShootReconciliationDeactivated).toBe(false)

    const shootResource = {
      metadata: {
        annotations: {
          'shoot.gardener.cloud/ignore': 'True',
        },
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isShootReconciliationDeactivated).toBe(true)
  })

  it('should compute isShootStatusHibernationProgressing correctly', () => {
    expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(false)

    let shootResource = {
      spec: {
        hibernation: {
          enabled: true,
        },
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isShootSettingHibernated).toBe(true)
    expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(true)

    shootResource = {
      spec: {
        hibernation: {
          enabled: true,
        },
      },
      status: {
        hibernated: true,
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isShootSettingHibernated).toBe(true)
    expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(false)
  })

  it('should compute isCustomShootDomain correctly', () => {
    expect(wrapper.vm.isCustomShootDomain).toBe(false)

    const shootResource = {
      spec: {
        dns: {
          providers: [
            { primary: true },
          ],
        },
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isCustomShootDomain).toBe(true)
  })

  it('should compute isShootLastOperationTypeDelete correctly', () => {
    expect(wrapper.vm.isShootLastOperationTypeDelete).toBe(false)

    const shootResource = {
      status: {
        lastOperation: {
          type: 'Delete',
        },
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isShootLastOperationTypeDelete).toBe(true)
  })

  it('should compute isShootLastOperationTypeControlPlaneMigrating correctly', () => {
    expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(false)

    let shootResource = {
      status: {
        lastOperation: {
          type: 'Migrate',
        },
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(true)

    shootResource = {
      status: {
        lastOperation: {
          type: 'Restore',
        },
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(true)
  })

  it('should compute isHibernationPossible correctly', () => {
    expect(wrapper.vm.isHibernationPossible).toBe(true)

    const shootResource = {
      status: {
        constraints: [
          {
            type: 'HibernationPossible',
            status: 'False',
          },
        ],
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isHibernationPossible).toBe(false)
  })

  it('should compute isMaintenancePreconditionSatisfied correctly', () => {
    expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(true)

    const shootResource = {
      status: {
        constraints: [
          {
            type: 'MaintenancePreconditionsSatisfied',
            status: 'False',
          },
        ],
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(false)
  })

  it('should compute isCACertificateValiditiesAcceptable correctly', () => {
    expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(true)

    const shootResource = {
      status: {
        constraints: [
          {
            type: 'CACertificateValiditiesAcceptable',
            status: 'False',
          },
        ],
      },
    }
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(false)
  })

  it('should compute isStaleShoot correctly', () => {
    expect(wrapper.vm.isStaleShoot).toBe(true)

    const shootStore = useShootStore()
    vi.spyOn(shootStore, 'isShootActive').mockResolvedValue(true)
    mountMixinWithShootResource({})

    expect(wrapper.vm.isStaleShoot).toBe(false)
  })

  it('should compute canForceDeleteShoot correctly', async () => {
    expect(wrapper.vm.canForceDeleteShoot).toBe(false)

    const shootResource = {
      metadata: {
        deletionTimestamp: '2023-01-01T20:57:01Z',
      },
      status: {
        lastErrors: [
          {
            codes: ['ERR_CLEANUP_CLUSTER_RESOURCES'],
          },
        ],
      },
    }
    const api = useApi()
    vi.spyOn(api, 'getConfiguration').mockResolvedValue({
      data: {
        features: {
          shootForceDeletionEnabled: true,
        },
      },
    })
    const configStore = useConfigStore()
    await configStore.fetchConfig()
    mountMixinWithShootResource(shootResource)

    expect(wrapper.vm.canForceDeleteShoot).toBe(true)
  })
})
