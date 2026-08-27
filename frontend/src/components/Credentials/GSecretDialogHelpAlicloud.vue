<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <p>
    Before you can provision and access a Kubernetes cluster on Alibaba Cloud, you need to add account credentials. To manage
    credentials for Alibaba Cloud Resource Access Management (RAM), use the
    <g-external-link url="https://ram.console.aliyun.com/overview">
      RAM Console
    </g-external-link>.
    The Gardener needs the credentials to provision and operate the Alibaba Cloud infrastructure for your Kubernetes cluster.
  </p>
  <p>
    Gardener uses encrypted system disk when creating Shoot, please enable ECS disk encryption on Alibaba Cloud Console
    (<g-external-link url="https://www.alibabacloud.com/help/doc-detail/59643.htm">
      official documentation
    </g-external-link>).
  </p>
  <p>
    Copy the Alibaba Cloud RAM policy document below and attach it to the RAM user
    (<g-external-link url="https://www.alibabacloud.com/help/product/28625.htm?spm=a3c0i.100866.1204872.1.79461e4eLtFABp">
      official documentation
    </g-external-link>).
    Alternatively, you can assign following permissions to the RAM user: AliyunECSFullAccess, AliyunSLBFullAccess,
    AliyunVPCFullAccess, AliyunEIPFullAccess, AliyunNATGatewayFullAccess.
  </p>
  <g-code-block
    max-height="100%"
    lang="json"
    :content="policy"
  />
</template>

<script setup>
import GCodeBlock from '@/components/GCodeBlock'
import GExternalLink from '@/components/GExternalLink'

defineProps({
  providerType: {
    type: String,
    required: true,
  },
})

const policy = JSON.stringify({
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
}, undefined, 2)
</script>
