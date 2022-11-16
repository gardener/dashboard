//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

export const rotationTypes = [
  {
    type: 'kubeconfig',
    hasRotationStatus: true,
    startOperation: 'rotate-kubeconfig-credentials',
    title: 'Kubeconfig'
  },
  {
    type: 'certificateAuthorities',
    hasRotationStatus: true,
    startOperation: 'rotate-ca-start',
    completionOperation: 'rotate-ca-complete',
    twoStep: true,
    title: 'Certificate Authorities'
  },
  {
    type: 'observability',
    hasRotationStatus: true,
    startOperation: 'rotate-observability-credentials',
    title: 'Observability Passwords'
  },
  {
    type: 'sshKeypair',
    hasRotationStatus: true,
    startOperation: 'rotate-ssh-keypair',
    title: 'SSH Key Pair for Worker Nodes'
  },
  {
    type: 'etcdEncryptionKey',
    hasRotationStatus: true,
    startOperation: 'rotate-etcd-encryption-key-start',
    completionOperation: 'rotate-etcd-encryption-key-complete',
    twoStep: true,
    title: 'ETCD Encryption Key'
  },
  {
    type: 'serviceAccountKey',
    hasRotationStatus: true,
    startOperation: 'rotate-serviceaccount-key-start',
    completionOperation: 'rotate-serviceaccount-key-complete',
    twoStep: true,
    title: 'ServiceAccount Token Signing Key'
  },
  {
    type: 'ALL_CREDENTIALS',
    startOperation: 'rotate-credentials-start',
    completionOperation: 'rotate-credentials-complete',
    title: 'Rotate All Credentials',
    twoStep: true
  }
]
