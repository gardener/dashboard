{{/*
This file should only be symlinked! This text should appear to be
modified only for a file in charts/_versions.tpl
*/}}

{{- define "rbacversion" -}}
rbac.authorization.k8s.io/v1
{{- end -}}

{{- define "deploymentversion" -}}
apps/v1
{{- end -}}

{{- define "ingressversion" -}}
networking.k8s.io/v1
{{- end -}}

{{- define "legacyingressversion" -}}
extensions/v1beta1
{{- end -}}