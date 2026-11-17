//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import createError from 'http-errors'

vi.mock('../lib/cache/index.js', () => ({
  default: {
    getQuotas: vi.fn(() => []),
  },
}))

import {
  createDns,
  createInfra,
  patchInfra,
  removeDns,
  removeInfra,
} from '../lib/services/cloudProviderCredentials.js'

const namespace = 'garden-test'

function secret (overrides = {}) {
  const { metadata = {}, ...rest } = overrides
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'credential',
      namespace,
      ...metadata,
    },
    ...rest,
  }
}

function credentialsBinding (overrides = {}) {
  const { metadata = {}, credentialsRef = {}, ...rest } = overrides
  return {
    apiVersion: 'security.gardener.cloud/v1alpha1',
    kind: 'CredentialsBinding',
    metadata: {
      name: 'credential',
      namespace,
      ...metadata,
    },
    provider: { type: 'aws' },
    credentialsRef: {
      apiVersion: 'v1',
      kind: 'Secret',
      name: 'credential',
      namespace,
      ...credentialsRef,
    },
    ...rest,
  }
}

function secretBinding (overrides = {}) {
  const { metadata = {}, secretRef = {}, ...rest } = overrides
  return {
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'SecretBinding',
    metadata: {
      name: 'credential',
      namespace,
      ...metadata,
    },
    provider: { type: 'aws' },
    secretRef: {
      name: 'credential',
      namespace,
      ...secretRef,
    },
    ...rest,
  }
}

function createClient () {
  const secrets = {
    create: vi.fn(async (_, value) => value),
    get: vi.fn(async () => secret()),
    update: vi.fn(async (_, __, value) => value),
    delete: vi.fn(),
  }
  const secretbindings = {
    create: vi.fn(),
    get: vi.fn(async () => {
      throw createError(404)
    }),
    list: vi.fn(async () => ({ items: [] })),
    delete: vi.fn(async (_, name) => ({ metadata: { name } })),
  }
  const credentialsbindings = {
    create: vi.fn(async (_, value) => value),
    get: vi.fn(async () => {
      throw createError(404)
    }),
    list: vi.fn(async () => ({ items: [] })),
    delete: vi.fn(async (_, name) => ({ metadata: { name } })),
  }
  return {
    core: { secrets },
    'core.gardener.cloud': {
      secretbindings,
      shoots: { list: vi.fn(async () => ({ items: [] })) },
    },
    'security.gardener.cloud': {
      credentialsbindings,
      workloadidentities: {
        get: vi.fn(),
        delete: vi.fn(),
      },
    },
  }
}

function deleteBinding (client, params = {}) {
  return removeInfra({
    user: { client },
    params: {
      bindingKind: 'CredentialsBinding',
      bindingNamespace: namespace,
      bindingName: 'credential',
      ...params,
    },
  })
}

describe('cloudProviderCredentials service', () => {
  it.each([
    [{ ...secret(), apiVersion: 'v2' }, 'v1, Kind=Secret'],
    [{ ...secret(), kind: 'ConfigMap' }, 'v1, Kind=Secret'],
    [{ ...secret(), metadata: { namespace } }, 'metadata.name'],
    [{ ...secret(), metadata: { name: 'credential' } }, 'metadata.namespace'],
  ])('rejects invalid Secret create and update manifests before mutation', async (value, message) => {
    const client = createClient()

    await expect(createDns({ user: { client }, params: { secret: value } })).rejects.toThrow(message)
    await expect(patchInfra({ user: { client }, params: { secret: value } })).rejects.toThrow(message)
    expect(client.core.secrets.create).not.toHaveBeenCalled()
    expect(client.core.secrets.update).not.toHaveBeenCalled()
  })

  it.each([
    [{ ...credentialsBinding(), apiVersion: 'v2' }, 'must use security.gardener.cloud/v1alpha1'],
    [{ ...credentialsBinding(), kind: 'SecretBinding' }, 'Creating SecretBindings is no longer supported'],
    [{ ...credentialsBinding(), kind: 'OtherBinding' }, 'A CredentialsBinding is required'],
    [{ ...credentialsBinding(), credentialsRef: { kind: 'Secret', name: 'credential' } }, 'complete credentialsRef'],
    [credentialsBinding({ credentialsRef: { kind: 'WorkloadIdentity' } }), 'must reference a v1 Secret'],
  ])('rejects invalid infrastructure bindings before mutation', async (binding, message) => {
    const client = createClient()

    await expect(createInfra({ user: { client }, params: { secret: secret(), binding } })).rejects.toThrow(message)
    expect(client.core.secrets.create).not.toHaveBeenCalled()
    expect(client['security.gardener.cloud'].credentialsbindings.create).not.toHaveBeenCalled()
  })

  it.each([
    [secret({ metadata: { name: 'other' } }), credentialsBinding(), 'matching API version, kind, name and namespace'],
    [secret({ metadata: { namespace: 'garden-other' } }), credentialsBinding(), 'matching API version, kind, name and namespace'],
    [secret(), credentialsBinding({ credentialsRef: { namespace: 'garden-other' } }), 'same namespace'],
  ])('rejects Secret and binding mismatches before mutation', async (value, binding, message) => {
    const client = createClient()

    await expect(createInfra({ user: { client }, params: { secret: value, binding } })).rejects.toThrow(message)
    expect(client.core.secrets.create).not.toHaveBeenCalled()
  })

  it('allows only an exact same-name SecretBinding migration without a new Secret', async () => {
    const client = createClient()
    const binding = credentialsBinding()
    client['core.gardener.cloud'].secretbindings.get.mockResolvedValue(secretBinding())

    const result = await createInfra({ user: { client }, params: { binding } })

    expect(result).toEqual({ binding })
    expect(client.core.secrets.create).not.toHaveBeenCalled()
    expect(client['security.gardener.cloud'].credentialsbindings.create).toHaveBeenCalledWith(namespace, binding)
  })

  it.each([
    [createError(404), 'only supported when migrating'],
    [{ ...secretBinding(), kind: 'CredentialsBinding' }, 'only supported when migrating'],
    [secretBinding({ metadata: { name: 'other' } }), 'only supported when migrating'],
    [secretBinding({ provider: { type: 'azure' } }), 'preserve the provider'],
    [secretBinding({ secretRef: { name: 'other' } }), 'preserve the provider'],
  ])('rejects arbitrary credential-less binding creation', async (source, message) => {
    const client = createClient()
    if (source instanceof Error) {
      client['core.gardener.cloud'].secretbindings.get.mockRejectedValue(source)
    } else {
      client['core.gardener.cloud'].secretbindings.get.mockResolvedValue(source)
    }

    await expect(createInfra({ user: { client }, params: { binding: credentialsBinding() } })).rejects.toThrow(message)
    expect(client['security.gardener.cloud'].credentialsbindings.create).not.toHaveBeenCalled()
  })

  it('rolls back a newly created Secret when binding creation fails', async () => {
    const client = createClient()
    const originalError = createError(403, 'binding forbidden')
    client['security.gardener.cloud'].credentialsbindings.create.mockRejectedValue(originalError)

    await expect(createInfra({ user: { client }, params: { secret: secret(), binding: credentialsBinding() } })).rejects.toBe(originalError)
    expect(client.core.secrets.delete).toHaveBeenCalledWith(namespace, 'credential')
  })

  it('preserves and augments the original binding error when rollback fails', async () => {
    const client = createClient()
    const originalError = createError(403, 'binding forbidden')
    client['security.gardener.cloud'].credentialsbindings.create.mockRejectedValue(originalError)
    client.core.secrets.delete.mockRejectedValue(createError(403, 'cleanup forbidden'))

    await expect(createInfra({ user: { client }, params: { secret: secret(), binding: credentialsBinding() } })).rejects.toBe(originalError)
    expect(originalError.message).toContain('could not be cleaned up')
    expect(originalError.message).toContain('cleanup forbidden')
  })

  it('keeps the legacy update recovery that recreates a missing Secret', async () => {
    const client = createClient()
    client.core.secrets.update.mockRejectedValue(createError(404))

    await patchInfra({ user: { client }, params: { secret: secret() } })

    expect(client.core.secrets.create).toHaveBeenCalledWith(namespace, secret())
  })

  it('deletes the binding before the credential without preflight reference reads', async () => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding())

    const result = await deleteBinding(client)

    expect(client['security.gardener.cloud'].credentialsbindings.delete).toHaveBeenCalledWith(namespace, 'credential')
    expect(client.core.secrets.delete).toHaveBeenCalledWith(namespace, 'credential')
    expect(client['security.gardener.cloud'].credentialsbindings.delete.mock.invocationCallOrder[0])
      .toBeLessThan(client.core.secrets.delete.mock.invocationCallOrder[0])
    expect(client['core.gardener.cloud'].shoots.list).not.toHaveBeenCalled()
    expect(client['core.gardener.cloud'].secretbindings.list).not.toHaveBeenCalled()
    expect(client['security.gardener.cloud'].credentialsbindings.list).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      credentialDeleted: true,
      credentialMissing: false,
      credentialPreserved: false,
    })
  })

  it.each([
    ['apiVersion'],
    ['kind'],
  ])('rejects a CredentialsBinding with a missing credentialsRef.%s before mutation', async field => {
    const client = createClient()
    const binding = credentialsBinding()
    delete binding.credentialsRef[field]
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(binding)

    await expect(deleteBinding(client)).rejects.toThrow('complete credential reference')
    expect(client['security.gardener.cloud'].credentialsbindings.delete).not.toHaveBeenCalled()
    expect(client.core.secrets.delete).not.toHaveBeenCalled()
  })

  it('rejects an unsupported credential apiVersion before mutation', async () => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding({
      credentialsRef: { apiVersion: 'example.test/v1' },
    }))

    await expect(deleteBinding(client)).rejects.toThrow('Unknown credential reference')
    expect(client['security.gardener.cloud'].credentialsbindings.delete).not.toHaveBeenCalled()
    expect(client.core.secrets.delete).not.toHaveBeenCalled()
  })

  it('rejects cross-namespace credential deletion before mutating either resource', async () => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding({
      credentialsRef: { namespace: 'garden-other' },
    }))

    await expect(deleteBinding(client)).rejects.toThrow('same namespace')
    expect(client['security.gardener.cloud'].credentialsbindings.delete).not.toHaveBeenCalled()
    expect(client.core.secrets.delete).not.toHaveBeenCalled()
  })

  it.each([403, 409])('reports the credential as preserved when Gardener rejects its deletion with %s', async statusCode => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding())
    client.core.secrets.delete.mockRejectedValue(createError(statusCode, 'credential is still in use'))

    const result = await deleteBinding(client)

    expect(client['security.gardener.cloud'].credentialsbindings.delete).toHaveBeenCalled()
    expect(result.credentialPreserved).toBe(true)
    expect(result.credentialPreservedReason).toContain('credential is still in use')
    expect(client['core.gardener.cloud'].shoots.list).not.toHaveBeenCalled()
  })

  it('relies on Gardener to reject deletion of a binding that is still used', async () => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding())
    const admissionError = createError(403, 'binding is still used by a Shoot')
    client['security.gardener.cloud'].credentialsbindings.delete.mockRejectedValue(admissionError)

    await expect(deleteBinding(client)).rejects.toBe(admissionError)
    expect(client.core.secrets.delete).not.toHaveBeenCalled()
    expect(client['core.gardener.cloud'].shoots.list).not.toHaveBeenCalled()
  })

  it('supports binding-only deletion without attempting Secret access or deletion', async () => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding())

    const result = await deleteBinding(client, { preserveCredential: true })

    expect(client.core.secrets.delete).not.toHaveBeenCalled()
    expect(client.core.secrets.get).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      credentialDeleted: false,
      credentialMissing: false,
      credentialPreserved: true,
      credentialPreservedReason: 'Only binding deletion was requested',
    })
  })

  it('deletes an orphaned binding and reports the missing Secret', async () => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding())
    client.core.secrets.delete.mockRejectedValue(createError(404))

    const result = await deleteBinding(client)

    expect(result).toMatchObject({
      credentialDeleted: false,
      credentialMissing: true,
      credentialPreserved: false,
    })
    expect(client['security.gardener.cloud'].credentialsbindings.delete).toHaveBeenCalled()
  })

  it('does not require access to project-wide reference lists', async () => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding())
    client['core.gardener.cloud'].shoots.list.mockRejectedValue(createError(403))
    client['core.gardener.cloud'].secretbindings.list.mockRejectedValue(createError(403))
    client['security.gardener.cloud'].credentialsbindings.list.mockRejectedValue(createError(403))

    const result = await deleteBinding(client)

    expect(result.credentialDeleted).toBe(true)
    expect(client['security.gardener.cloud'].credentialsbindings.delete).toHaveBeenCalled()
    expect(client.core.secrets.delete).toHaveBeenCalled()
    expect(client['core.gardener.cloud'].shoots.list).not.toHaveBeenCalled()
    expect(client['core.gardener.cloud'].secretbindings.list).not.toHaveBeenCalled()
    expect(client['security.gardener.cloud'].credentialsbindings.list).not.toHaveBeenCalled()
  })

  it('returns a recoverable partial outcome for an unexpected credential deletion error', async () => {
    const client = createClient()
    client['security.gardener.cloud'].credentialsbindings.get.mockResolvedValue(credentialsBinding())
    const deletionError = createError(500, 'apiserver unavailable')
    client.core.secrets.delete.mockRejectedValue(deletionError)

    const result = await deleteBinding(client)

    expect(client['security.gardener.cloud'].credentialsbindings.delete).toHaveBeenCalled()
    expect(result).toMatchObject({
      credentialRef: {
        apiVersion: 'v1',
        kind: 'Secret',
        namespace,
        name: 'credential',
      },
      credentialDeleted: false,
      credentialMissing: false,
      credentialDeletionUnconfirmed: true,
      credentialDeletionError: 'apiserver unavailable',
      credentialPreserved: false,
    })
  })

  it('deletes old DNS bindings that reference the Secret after deleting the Secret', async () => {
    const client = createClient()
    const legacyBinding = secretBinding({ provider: { type: 'aws-route53' } })
    client['core.gardener.cloud'].secretbindings.list.mockResolvedValue({ items: [legacyBinding] })

    await removeDns({
      user: { client },
      params: { credentialKind: 'Secret', credentialNamespace: namespace, credentialName: 'credential' },
    })

    expect(client['core.gardener.cloud'].secretbindings.delete).toHaveBeenCalledWith(namespace, 'credential')
    expect(client.core.secrets.delete).toHaveBeenCalledWith(namespace, 'credential')
    expect(client.core.secrets.delete.mock.invocationCallOrder[0])
      .toBeLessThan(client['core.gardener.cloud'].secretbindings.delete.mock.invocationCallOrder[0])
    expect(client['core.gardener.cloud'].shoots.list).not.toHaveBeenCalled()
  })

  it('propagates Gardener admission errors for referenced DNS Secrets', async () => {
    const client = createClient()
    const admissionError = createError(403, 'Secret is still referenced')
    client.core.secrets.delete.mockRejectedValue(admissionError)

    await expect(removeDns({
      user: { client },
      params: { credentialKind: 'Secret', credentialNamespace: namespace, credentialName: 'credential' },
    })).rejects.toBe(admissionError)

    expect(client.core.secrets.delete).toHaveBeenCalled()
    expect(client['core.gardener.cloud'].shoots.list).not.toHaveBeenCalled()
  })

  it('protects an unrelated same-name binding and never deletes a WorkloadIdentity binding', async () => {
    const client = createClient()
    const unrelated = credentialsBinding({
      provider: { type: 'aws-route53' },
      credentialsRef: {
        apiVersion: 'security.gardener.cloud/v1alpha1',
        kind: 'WorkloadIdentity',
      },
    })
    client['security.gardener.cloud'].credentialsbindings.list.mockResolvedValue({ items: [unrelated] })

    await removeDns({
      user: { client },
      params: { credentialKind: 'Secret', credentialNamespace: namespace, credentialName: 'credential' },
    })

    expect(client['security.gardener.cloud'].credentialsbindings.delete).not.toHaveBeenCalled()
    expect(client.core.secrets.delete).toHaveBeenCalledWith(namespace, 'credential')
  })

  it('propagates legacy binding lookup errors after requesting Secret deletion', async () => {
    const client = createClient()
    const lookupError = createError(403, 'binding list forbidden')
    client['core.gardener.cloud'].secretbindings.list.mockRejectedValue(lookupError)

    await expect(removeDns({
      user: { client },
      params: { credentialKind: 'Secret', credentialNamespace: namespace, credentialName: 'credential' },
    })).rejects.toBe(lookupError)

    expect(client.core.secrets.delete).toHaveBeenCalledWith(namespace, 'credential')
  })

  it('deletes a pre-existing WorkloadIdentity request without reference preflight', async () => {
    const client = createClient()

    await removeDns({
      user: { client },
      params: { credentialKind: 'WorkloadIdentity', credentialNamespace: namespace, credentialName: 'credential' },
    })

    expect(client['security.gardener.cloud'].workloadidentities.delete).toHaveBeenCalledWith(namespace, 'credential')
    expect(client['security.gardener.cloud'].workloadidentities.get).not.toHaveBeenCalled()
    expect(client['core.gardener.cloud'].shoots.list).not.toHaveBeenCalled()
  })
})
