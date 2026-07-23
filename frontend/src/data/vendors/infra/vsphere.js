export default {
  name: 'vsphere',
  displayName: 'vSphere',
  weight: 700,
  icon: 'vsphere.svg',
  secret: {
    details: [
      {
        label: 'vSphere Username',
        valueFrom: {
          keys: [
            ['vsphereUsername'],
            ['vSphereUsername'],
          ],
        },
      },
      {
        label: 'NSX-T Username',
        valueFrom: {
          keys: [
            ['nsxtUsername'],
            ['NSXTUsername'],
          ],
        },
      },
    ],
  },
}
