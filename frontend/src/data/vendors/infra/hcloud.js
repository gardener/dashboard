export default {
  name: 'hcloud',
  displayName: 'Hetzner Cloud',
  weight: 800,
  icon: 'hcloud.svg',
  secret: {
    details: [
      {
        label: 'Hetzner Cloud Token',
        hidden: true,
      },
    ],
  },
}
