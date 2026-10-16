import {
  accessKeyIdDetail,
  accessKeyIdField,
  accessKeySecretField,
} from '../infra/alicloud'

export default {
  name: 'alicloud-dns',
  displayName: 'Alicloud DNS',
  weight: 600,
  icon: 'alicloud-dns.png',
  secret: {
    details: [
      accessKeyIdDetail,
    ],
    fields: [
      { ...accessKeyIdField, aliases: ['ACCESS_KEY_ID'] },
      { ...accessKeySecretField, aliases: ['ACCESS_KEY_SECRET'] },
    ],
    help: `
      <p>
        You need to provide an access key (access key ID and secret access key) for Alibaba Cloud to allow the dns-controller-manager to authenticate to Alibaba Cloud DNS.
      </p>
      <p>
        For details see
        <a href="https://github.com/aliyun/alibaba-cloud-sdk-go/blob/master/docs/2-Client-EN.md#accesskey-client">AccessKey Client</a>.
        Currently the regionId is fixed to cn-shanghai.
      </p>
    `,
  },
}
