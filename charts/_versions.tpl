{{/*
This file should only be symlinked! This text should appear to be
modified only for a file in charts/_versions.tpl
*/}}

{{- define "rbacversion" -}}
{{- if semverCompare ">= 1.8" .Capabilities.KubeVersion.GitVersion -}}
rbac.authorization.k8s.io/v1
{{- else -}}
rbac.authorization.k8s.io/v1beta1
{{- end -}}
{{- end -}}

{{- define "deploymentversion" -}}
{{- if semverCompare ">= 1.9" .Capabilities.KubeVersion.GitVersion -}}
apps/v1
{{- else if semverCompare "= 1.8" .Capabilities.KubeVersion.GitVersion -}}
apps/v1beta2
{{- else -}}
apps/v1beta1
{{- end -}}
{{- end -}}

{{- define "ingressversion" -}}
extensions/v1beta1
{{- end -}}