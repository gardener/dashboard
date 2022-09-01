//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

export const rotationTypes = {
  kubeconfig: {
    initOperation: 'rotate-kubeconfig-credentials',
    title: 'Kubeconfig'
  },
  certificateAuthorities: {
    initOperation: 'rotate-ca-start',
    completionOperation: 'rotate-ca-complete',
    twoPhase: true,
    title: 'Certificate Authorities'
  },
  observability: {
    initOperation: 'rotate-observability-credentials',
    title: 'Observability Passwords'
  },
  sshKeypair: {
    initOperation: 'rotate-ssh-keypair',
    title: 'SSH Key Pair for Worker Nodes'
  },
  etcdEncryptionKey: {
    initOperation: 'rotate-etcd-encryption-key-start',
    completionOperation: 'rotate-etcd-encryption-key-complete',
    twoPhase: true,
    title: 'ETCD Encryption Key'
  },
  serviceAccountKey: {
    initOperation: 'rotate-serviceaccount-key-start',
    completionOperation: 'rotate-serviceaccount-key-complete',
    twoPhase: true,
    title: 'ServiceAccount Token Signing Key'
  },
  allCredentials: {
    initOperation: 'rotate-credentials-start',
    completionOperation: 'rotate-credentials-complete',
    title: 'Rotate All Credentials'
  }
}
