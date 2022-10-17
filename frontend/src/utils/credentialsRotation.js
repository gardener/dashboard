//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

export const rotationTypes = [
  {
    type: 'kubeconfig',
    startOperation: 'rotate-kubeconfig-credentials',
    title: 'Kubeconfig'
  },
  {
    type: 'certificateAuthorities',
    startOperation: 'rotate-ca-start',
    completionOperation: 'rotate-ca-complete',
    twoStep: true,
    title: 'Certificate Authorities'
  },
  {
    type: 'observability',
    startOperation: 'rotate-observability-credentials',
    title: 'Observability Passwords'
  },
  {
    type: 'sshKeypair',
    startOperation: 'rotate-ssh-keypair',
    title: 'SSH Key Pair for Worker Nodes'
  },
  {
    type: 'etcdEncryptionKey',
    startOperation: 'rotate-etcd-encryption-key-start',
    completionOperation: 'rotate-etcd-encryption-key-complete',
    twoStep: true,
    title: 'ETCD Encryption Key'
  },
  {
    type: 'serviceAccountKey',
    startOperation: 'rotate-serviceaccount-key-start',
    completionOperation: 'rotate-serviceaccount-key-complete',
    twoStep: true,
    title: 'ServiceAccount Token Signing Key'
  },
  {
    // no type as this rotation is the 'all credential rotatiom trigger', which as no dedicated key in the rotation status
    startOperation: 'rotate-credentials-start',
    completionOperation: 'rotate-credentials-complete',
    title: 'Rotate All Credentials'
  }
]
