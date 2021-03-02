# Theming

## Motivation
Gardener landscape administrators should have the possibility to change the appearance of the Gardener Dashboard via configuration without the need to touch the code.

## Colors
Gardener Dashboard has been built with Vuetify. We use Vuetify's built-in [theming support](https://vuetifyjs.com/en/features/theme/) to centrally configure colors that are used throughout the web application.
Colors can be configured for both light and dark themes. Configuration is done via the helm chart, see the respective theme section there. Colors cam be specified as HTML color code (e.g. #FF0000 for red) or by referencing a color from Vuetify's Material Design [Color Pack](https://vuetifyjs.com/en/styles/colors/#javascript-color-pack).

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

## Logos and Icons
It is also possible to exchange the Dashboard logo and icons. You can replace the assets folder via a volume mount in your deployment.

The simplest solution is to create a configmap and add the assets to it:
```
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-assets
data:
  logo.svg: |
    ...
```

then you can map the assets to your dashboard in your deployment like this:
```
...
volumes:
  - configMap:
    items:
    name: dashboard-assets
  name: assets
```

Attention: You need to replace all assets in the `public/static/assets` folder, as mapping the volume will overwrite all files. It is not possible to exchange single files.
