//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import GTicketsCard from '@/components/GTicketsCard.vue'

describe('GTicketsCard', () => {
  it('renders ticket variables without evaluating template code', () => {
    const ticketLink = GTicketsCard.computed.ticketLink.call({
      ticketConfig: {
        gitHubRepoUrl: 'https://github.example/gardener/dashboard',
        newIssue: {
          body: '${accessRestrictions} <% throw new Error("do not execute") %>', // eslint-disable-line no-template-curly-in-string
          labels: ['platform/${providerType}'], // eslint-disable-line no-template-curly-in-string
        },
      },
      gitHubRepoUrl: 'https://github.example/gardener/dashboard',
      shootName: 'shoot',
      shootNamespace: 'garden-project',
      shootCreatedAt: '2026-01-01',
      shootUrl: 'https://dashboard.example/projects/project/clusters/shoot',
      shootProviderType: 'aws',
      shootRegion: 'eu-west-1',
      shootMachineImageNames: 'gardenlinux',
      shootProjectName: 'project',
      shootSeedName: 'seed',
      shootAccessRestrictions: [{
        title: 'EU Access',
        options: [{ title: 'Support Access' }],
      }],
    })
    const url = new URL(ticketLink)

    expect(url.searchParams.get('body')).toBe(`## Attention: This cluster has access restrictions
  - EU Access
    - Support Access
 <% throw new Error("do not execute") %>`)
    expect(url.searchParams.get('labels')).toBe('platform/aws')
  })
})
