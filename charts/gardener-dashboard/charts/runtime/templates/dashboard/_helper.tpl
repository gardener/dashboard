{{- define "login-config" -}}
{{- $landingPageUrl := .frontendConfig.landingPageUrl }}
{{- $loginTypes := list "token" }}
{{- if .oidc }}
  {{- $loginTypes = prepend $loginTypes "oidc" }}
{{- end }}
{{- $data := dict "landingPageUrl" $landingPageUrl "loginTypes" $loginTypes }}
{{- if .frontendConfig.branding }}
  {{- $data = merge $data (dict "branding" .frontendConfig.branding) }}
{{- end }}
{{- if .frontendConfig.themes }}
  {{- $data = merge $data (dict "themes" .frontendConfig.themes) }}
{{- end }}
{{- toJson $data }}
{{- end }}
