# Theming

## Motivation
Gardener landscape administrators should have the possibility to change the appearance of the Gardener Dashboard via configuration without the need to touch the code.

## Colors
Gardener Dashboard has been built with Vuetify. We use Vuetify's built-in [theming support](https://vuetifyjs.com/en/features/theme/) to centrally configure colors that are used throughout the web application.
Colors can be configured for both light and dark themes. Configuration is done via the helm chart, see the respective theme section there. Colors can be specified as HTML color code (e.g. #FF0000 for red) or by referencing a color from Vuetify's Material Design [Color Pack](https://vuetifyjs.com/en/styles/colors/#javascript-color-pack).

The following colors can be configured:

| name                    | usage|
| ----------------------- |------|
| `primary`               | icons, chips, buttons, popovers, etc. |
| `anchor`                | links |
| `main-background`       | main navigation, login page   |
| `main-navigation-title` | text color on main navigation |
| `toolbar-background`    | background color for toolbars in cards, dialogs, etc. |
| `toolbar-title`         | text color for toolbars in cards, dialogs, etc. |
| `action-button`         | buttons in tables and cards, e.g. cluster details page |
| `info`                  | Snotify info popups |
| `warning`               | Snotify warning popups, warning texts |
| `error`                 | Snotify error popups, error texts |

If you use the helm chart, you can configure those with `frontendConfig.themes.light` for the light theme and `frontendConfig.themes.dark` for the dark theme.

### Example

```yaml
frontend:
  themes:
    light:
      primary: '#0b8062'
      anchor: '#0b8062'
      main-background: 'grey.darken3'
      main-navigation-title: 'shades.white'
      toolbar-background: '#0b8062'
      toolbar-title: 'shades.white'
      action-button: 'grey.darken4'
```

## Logos and Icons

It is also possible to exchange the Dashboard logo and icons. You can replace the [assets](https://github.com/gardener/dashboard/tree/master/frontend/public/static/assets) folder when using the [helm chart](https://github.com/gardener/dashboard/blob/master/charts/gardener-dashboard) in the `frontendConfig.assets` map.

Attention: You need to set values for all files as mapping the volume will overwrite all files. It is not possible to exchange single files.

The files have to be encoded as base64 for the chart - to generate the encoded files for the `values.yaml` of the helm chart, you can use the following shorthand with `bash` or `zsh` on Linux systems. If you use macOS, install coreutils with brew (`brew install coreutils`) or remove the `-w0` parameter.

```bash
cat << EOF
  ###
  ### COPY EVERYTHING BELOW THIS LINE
  ###

  assets:
    favicon-16x16.png: |
      $(cat frontend/public/static/assets/favicon-16x16.png | base64 -w0)
    favicon-32x32.png: |
      $(cat frontend/public/static/assets/favicon-32x32.png | base64 -w0)
    favicon-96x96.png: |
      $(cat frontend/public/static/assets/favicon-96x96.png | base64 -w0)
    favicon.ico: |
      $(cat frontend/public/static/assets/favicon.ico | base64 -w0)
    logo.svg: |
      $(cat frontend/public/static/assets/logo.svg | base64 -w0)
EOF
```

Then, swap in the base64 encoded version of your files where needed.
