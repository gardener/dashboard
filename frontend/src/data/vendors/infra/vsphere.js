export default {
  name: 'vsphere',
  displayName: 'vSphere',
  weight: 700,
  icon: 'vsphere.svg',
  secret: {
    details: [
      {
        label: 'vSphere Username',
        key: ['vsphereUsername', 'vSphereUsername'],
      },
      {
        label: 'NSX-T Username',
        key: ['nsxtUsername', 'NSXTUsername'],
      },
    ],
  },
}
