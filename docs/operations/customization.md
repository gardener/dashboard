# Theming and Branding

## Motivation
Gardener landscape administrators should have the possibility to change the appearance and the branding of the Gardener Dashboard via configuration without the need to touch the code.


## Branding

It is also possible to change the branding of the Gardener Dashboard when using the [helm chart](https://github.com/gardener/dashboard/blob/master/charts/gardener-dashboard) in the `frontendConfig.branding` map. The following configuration properties are supported:

| name | description | default |
| ---- | ----------- | ------- |
| `productName` | Name of the Gardener product | `Gardener` |
| `productTitle` | Title of the Gardener product displayed below the logo | `Gardener`  |
| `productTitleSuperscript` | Superscript next to the product title | Production version (e.g 1.73.1) |
| `productSlogan` | Slogan that is displayed under the product title and on the login page| `Universal Kubernetes at Scale` |
| `productLogoUrl` | URL for the product logo   | `/static/assets/logo.svg` |
| `teaserHeight` | Height of the teaser in the [GMainNavigation](https://github.com/gardener/dashboard/blob/master/frontend/src/components/GMainNavigation.vue) component | `200` |
| `teaserTemplate` | Custom HTML template to replace to teaser content | refer to [GTeaser](https://github.com/gardener/dashboard/blob/master/frontend/src/components/GTeaser.vue) |
| `loginTeaserHeight` | Height of the login teaser in the [GLogin](https://github.com/gardener/dashboard/blob/master/frontend/src/layouts/GLogin.vue) component | `260` |
| `loginTeaserTemplate` | Custom HTML template to replace to login teaser content | refer to [GLoginTeaser](https://github.com/gardener/dashboard/blob/master/frontend/src/components/GLoginTeaser.vue) |
| `loginFooterHeight` | Height of the login footer in the [GLogin](https://github.com/gardener/dashboard/blob/master/frontend/src/layouts/GLogin.vue) component | `24` |
| `loginFooterTemplate` | Custom HTML template to replace to login footer content | refer to [GLoginFooter](https://github.com/gardener/dashboard/blob/master/frontend/src/components/GLoginFooter.vue) |
| `loginHints` | Links [`{ title: string; href: string; }`](https://vuetifyjs.com/en/api/v-breadcrumbs/#props-items) to product related sites shown below the login button  | `undefined` |
| `oidcLoginTitle` | Title of tabstrip for loginType OIDC | `OIDC` |
| `oidcLoginText` | Text show above the login button on the OIDC tabstrip | `Press Login to be redirected to`<br> `configured OpenID Connect Provider.` |

### Example

The following example configuration in `values.yaml` shows some of the possibilities to achieve a custom theming and branding:

```yaml
global:
  dashboard:
    frontendConfig:
      # ...
      branding:
        productLogoUrl: data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzBCODA2MiIgZD0iTTIsMjJWMjBDMiwyMCA3LDE4IDEyLDE4QzE3LDE4IDIyLDIwIDIyLDIwVjIySDJNMTEuMyw5LjFDMTAuMSw1LjIgNCw2LjEgNCw2LjFDNCw2LjEgNC4yLDEzLjkgOS45LDEyLjdDOS41LDkuOCA4LDkgOCw5QzEwLjgsOSAxMSwxMi40IDExLDEyLjRWMTdDMTEuMywxNyAxMS43LDE3IDEyLDE3QzEyLjMsMTcgMTIuNywxNyAxMywxN1YxMi44QzEzLDEyLjggMTMsOC45IDE2LDcuOUMxNiw3LjkgMTQsMTAuOSAxNCwxMi45QzIxLDEzLjYgMjEsNCAyMSw0QzIxLDQgMTIuMSwzIDExLjMsOS4xWiIgLz48L3N2Zz4=
        productName: Nucleus
        productTitleSuperscript: false
        productTitle: Nucleus Live
        productDescription: Supercool Cluster Service
        teaserHeight: 160
        teaserTemplate: |
          <div
            class="text-center px-2"
          >
            <a
              href="/"
              class="text-decoration-none"
            >
              <img
                src="{{ productLogoUrl }}"
                width="80"
                height="80"
                alt="{{ productName }} Logo"
                class="pointer-events-none"
              >
              <div
                class="font-weight-thin text-grey-lighten-4"
                style="font-size: 32px; line-height: 32px; letter-spacing: 2px;"
              >
                {{ productTitle }}
              </div>
              <div class="text-body-1 font-weight-normal text-primary mt-1">
                {{ productDescription }}
              </div>
            </a>
          </div>
        loginTeaserHeight: 296
        loginTeaserTemplate: |
          <div
            class="d-flex flex-column align-center justify-center bg-main-background-darken-1 pa-3"
            style="min-height: {{minHeight}}px"
          >
            <img
              src="{{productLogoUrl}}"
              alt="Login to {{productName}}"
              width="140"
              height="140"
              class="mt-2"
            >
            <div class="text-h3 text-center font-weight-thin text-white mt-4">
              {{productTitle}}
            </div>
            <div class="text-h5 text-center font-weight-light text-primary mt-1">
              {{productSlogan}}
            </div>
          </div>
        loginFooterTemplate: |
          <div class="text-anchor text-caption">
            Copyright 2023 by Nucleus Corporation
          </div>
        loginHints:
          - title: Support
            href: https://gardener.cloud
          - title: Documentation
            href: https://gardener.cloud/docs
        oidcLoginTitle: MyIDP
        oidcLoginText: Press LOGIN to be redirected to My Identity Service.
      themes:
        light:
          primary: '#354a5f'
          anchor: '#5b738b'
          main-background: '#354a5f'
          main-navigation-title: '#f5f6f7'
          toolbar-background: '#354a5f'
          toolbar-title: '#f5f6f7'
          action-button: '#354a5f'
        dark:
          primary: '#5b738b'
          anchor: '#5b738b'
          background: '#354a5f'
          surface: '#1a2733'
          main-background: '#1a2733'
          main-navigation-title: '#f5f6f7'
          toolbar-background: '#354a5f'
          toolbar-title: '#f5f6f7'
          action-button: '#5b738b'
```

#### Login Screen
In this example, the login screen now displays the custom logo in a different size. The product title is also shown, and the OIDC tabstrip title and text have been changed to a custom-specific one. Product-related links are displayed below the login button. The footer contains a copyright notice for the custom company.

<img width="420" src="../images/customization-dark-1.png">

#### Teaser in Main Navigation
The template approach is also used in this case to change the `font-size` and `line-height` of the product title and slogan. The product version (superscript) is omitted.

<img width="400" src="../images/customization-dark-2.png">

#### About Dialog
By changing the `productLogoUrl` and the `productName`, the changes automatically effect the apperance of the About Dialog.

<img width="320" src="../images/customization-dark-3.png">

## Colors
Gardener Dashboard has been built with Vuetify. We use Vuetify's built-in [theming support](https://vuetifyjs.com/en/features/theme/) to centrally configure colors that are used throughout the web application.
Colors can be configured for both light and dark themes. Configuration is done via the helm chart, see the respective theme section there. Colors can be specified as HTML color code (e.g. `#FF0000` for red) or by referencing a color from Vuetify's Material Design [Color Pack](https://vuetifyjs.com/en/styles/colors/#javascript-color-pack).

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
| `info`                  | notification info popups, texts and status tags |
| `success`               | notification success popups, texts and status tags |
| `warning`               | notification warning popups, texts and status tags |
| `error`                 | notification error popups, texts and status tags |
| `unknown`               | status tags with unknown severity |
| ...                     | all other Vuetify theme [colors](https://vuetifyjs.com/en/styles/colors/) |

If you use the helm chart, you can configure those with `frontendConfig.themes.light` for the light theme and `frontendConfig.themes.dark` for the dark theme.

### Example

```yaml
global:
  dashboard:
    frontendConfig:
      # ...
      themes:
        light:
          primary: '#0b8062'
          anchor: '#0b8062'
          main-background: 'grey.darken3'
          main-navigation-title: 'shades.white'
          toolbar-background: '#0b8062'
          toolbar-title: 'shades.white'
          action-button: 'grey.darken4'
        dark:
          primary: '#0b8062'
          anchor: '#0b8062'
          main-background: 'grey.darken3'
          main-navigation-title: 'shades.white'
          toolbar-background: '#0b8062'
          toolbar-title: 'shades.white'
          action-button: 'grey.lighten4'
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

