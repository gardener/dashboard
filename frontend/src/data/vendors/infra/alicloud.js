//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'alicloud',
  displayName: 'Alibaba Cloud',
  weight: 500,
  icon: 'alicloud.svg',
  shoot: {
    templates: {
      provider: {
        type: 'alicloud',
        infrastructureConfig: {
          apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: '__DEFAULT_WORKER_CIDR__',
            },
          },
        },
        controlPlaneConfig: {
          apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      },
      networking: {
        nodes: '__DEFAULT_WORKER_CIDR__',
      },
    },
    zoneNetworking: {
      strategy: 'alicloud',
    },
  },
  secret: {
    fields: [
      {
        key: 'accessKeyID',
        label: 'Access Key ID',
        hint: 'e.g. QNJebZ17v5Q7pYpP',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'secretAccessKey',
        label: 'Access Key Secret',
        hint: 'e.g. WJalrXUtnFEMIK7MDENG/bPxRfiCYz',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
    help: `
      <p>
        Before you can provision and access a Kubernetes cluster on Alibaba Cloud, you need to add account credentials. To manage
        credentials for Alibaba Cloud Resource Access Management (RAM), use the
        <a href="https://ram.console.aliyun.com/overview">RAM Console</a>.
        The Gardener needs the credentials to provision and operate the Alibaba Cloud infrastructure for your Kubernetes cluster.
      </p>
      <p>
        Gardener uses encrypted system disk when creating Shoot, please enable ECS disk encryption on Alibaba Cloud Console
        (<a href="https://www.alibabacloud.com/help/doc-detail/59643.htm">official documentation</a>).
      </p>
      <p>
        Copy the Alibaba Cloud RAM policy document below and attach it to the RAM user
        (<a href="https://www.alibabacloud.com/help/product/28625.htm?spm=a3c0i.100866.1204872.1.79461e4eLtFABp">official documentation</a>).
        Alternatively, you can assign following permissions to the RAM
        user: AliyunECSFullAccess, AliyunSLBFullAccess, AliyunVPCFullAccess, AliyunEIPFullAccess, AliyunNATGatewayFullAccess.
      </p>
    `,
    helpJSONTemplate: {
      Statement: [
        {
          Action: 'vpc:*',
          Effect: 'Allow',
          Resource: '*',
        },
        {
          Action: 'ecs:*',
          Effect: 'Allow',
          Resource: '*',
        },
        {
          Action: 'slb:*',
          Effect: 'Allow',
          Resource: '*',
        },
        {
          Action: [
            'ram:GetRole',
            'ram:CreateRole',
            'ram:CreateServiceLinkedRole',
          ],
          Effect: 'Allow',
          Resource: '*',
        },
        {
          Action: 'ros:*',
          Effect: 'Allow',
          Resource: '*',
        },
      ],
      Version: '1',
    },
  },
}
