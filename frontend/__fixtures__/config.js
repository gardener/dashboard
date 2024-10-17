//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  helpMenuItems: [
    {
      title: 'Homepage',
      icon: 'mdi-file-document',
      url: 'https://gardener.cloud',
    },
    {
      title: 'GitHub',
      icon: 'mdi-github',
      url: 'https://github.com/gardener',
    },
  ],
  features: {
    terminalEnabled: false,
    projectTerminalShortcutsEnabled: false,
  },
  defaultHibernationSchedule: {
    development: [
      {
        end: '00 08 * * 1,2,3,4,5',
        start: '00 17 * * 1,2,3,4,5',
      },
    ],
    evaluation: [
      {
        start: '00 17 * * 1,2,3,4,5',
      },
    ],
    production: null,
  },
  shootAdminKubeconfig: {
    enabled: false,
    maxExpirationSeconds: 86400,
  },
  seedCandidateDeterminationStrategy: 'MinimalDistance',
  costObjects: [
    {
      type: 'CO',
      title: 'Cost Center',
      description: 'Costs for the control planes of the clusters in this project will be charged to this cost center.',
      regex: '^([0-9]{9,10})?$',
      errorMessage: 'Must be a valid cost center',
    },
  ],
  sla: {
    title: 'Terms and Conditions',
    description: '<p><a href="https://gardener.cloud/terms-and-conditions" target="_blank">Terms and Conditions</a></p>',
  },
  accessRestriction: {
    noItemsText: 'Limited Access services for certain cloud providers and regions',
    items: [
      {
        key: 'seed.gardener.cloud/eu-access',
        display: {
          visibleIf: true,
          title: 'Limited Access',
          description: 'Clusters will not be migrated ...',
        },
        input: {
          title: 'Limited Access',
          description: 'Limited Access is an optional service ...',
        },
        options: [
          {
            key: 'support.gardener.cloud/eu-access-for-cluster-addons',
            display: {
              visibleIf: false,
              title: 'Limited Access Only for Cluster Addons Support',
              description: 'Only third-level/dev support at usual 8x5 working hours ...',
            },
            input: {
              title: 'No personal data is used as name or in the content of ...',
              description: 'If you can\'t comply, only third-level/dev support at usual 8x5 working hours ...',
              inverted: true,
            },
          },
          {
            key: 'support.gardener.cloud/eu-access-for-cluster-nodes',
            display: {
              visibleIf: false,
              title: 'Limited Access Only for Worker Node Support',
              description: '<p>Only third-level/dev support at usual 8x5 working hours ...',
            },
            input: {
              title: 'No personal data is stored in any Kubernetes volume ...',
              description: 'If you can\'t comply, only third-level/dev support at usual 8x5 working hours ...',
              inverted: true,
            },
          },
        ],
      },
    ],
  },
  vendorHints: [
    {
      matchNames: [
        'suse-chost',
      ],
      message: 'The image is free to use for evaluation purposes',
      severity: 'warning',
    },
  ],
  defaultNodesCIDR: '10.180.0.0/16',
  serviceAccountDefaultTokenExpiration: 7776000,
  apiServerUrl: 'https://api.gardener.cloud',
  clusterIdentity: 'gardener-landscape-dev',
}
