import alicloud from '../infra/alicloud'

export default {
  name: 'alicloud-dns',
  displayName: 'Alicloud DNS',
  weight: 600,
  icon: 'alicloud-dns.png',
  secret: {
    details: alicloud.secret.details,
  },
}
