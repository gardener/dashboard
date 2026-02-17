//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import alicloud from '../infra/alicloud'

export default {
  name: 'alicloud-dns',
  displayName: 'Alicloud DNS',
  weight: 600,
  icon: 'alicloud-dns.png',
  secret: {
    fields: alicloud.secret.fields,
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
