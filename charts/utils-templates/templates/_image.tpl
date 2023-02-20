{{- define "utils-templates.image" -}}
{{- $tag := required ".tag is required" .tag -}}
{{- $repository := required ".repository is required" .repository -}}
{{- $separator := ":" -}}
{{- if hasPrefix "sha256:" $tag -}}
{{- $separator = "@" -}}
{{- end -}}
{{ print $repository $separator $tag }}
{{- end -}}
