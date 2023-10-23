# Configure Vendors and Custom Cloud Providers

## Motivation
Gardener landscape administrators should have the possibility to change icons and name of vendors (cloud providers, image vendors etc.). This enables the administator to adjust vendors and apply company or context specific values. A usage example could be a locally hosted OpenStack infrastructure that should appear as `MyCustomCloud` with a custom icon in the Dashboard so that the user immediately identifies it as `MyCustomCloud` as he might not be famililar with the term `OpenStack`.

## Vendor Configuration
It is possible to change the name and icon of build-in vendors in the Gardener Dashboard (e.g. aws, ubuntu etc.) when using the [helm chart](https://github.com/gardener/dashboard/blob/master/charts/gardener-dashboard) in the `frontend.vendors` map. You can add a key for each vendor that you want to customize. The following configuration properties are supported:

| name | description |
| ---- | ----------- |
| `name` | Name of the vendor |
| `icon` | Asset name as defined in the vendor asset map. You can also use [data:](https://developer.mozilla.org/en-US/docs/web/http/basics_of_http/data_urls) scheme for development. For production it is recommended to provide static assets |

Besides overwriting built-in vendors, you can also add additonal vendors that the Dashboard does not already support. E.g. additional machine image vendors or a cloud provider that you have defined via [cloud provider configuration](#configure-available-cloud-providers).

## Configure Available Cloud Providers
Gardener Dashboard has a list of built-in cloud providers:
`'aws', 'azure', 'gcp', 'openstack', 'alicloud', 'metal', 'vsphere', 'hcloud', 'onmetal', 'local'`

The Dashboard renders available cloud providers in the order defined by the list.
> **_NOTE:_**  A cloud provider is considered `available` if at least one cloud profile as well as a matching seed is defined for a Gardener landscape. If you add custom cloud providers, they will only appear if you have configured these prerequisites in your landscape

You can overwrite the list by providing the `frontend.cloudProviderList` array using the [helm chart](https://github.com/gardener/dashboard/blob/master/charts/gardener-dashboard).
This way you can change the order or hide cloud providers from the Gardener Dashboard by ommiting it in the list. You can also add additional (custom) cloud providers. You can overwrite the appearance of the custom cloud providers via [vendor configuration](#vendor-configuration). You can configure details of the custom cloud provider, see [custom cloud providers](#custom-cloud-providers)

## Custom Cloud Providers
You can add custom cloud providers and define the secret dialog input values as well as add a default shoot spec where you can provide values that are required for the shoot resource. The values can be configured using the helm chart in the `frontend.customCloudProviders` map. You can add a key for each vendor that you want to customize. The following configuration properties are supported:

| name | description |
| ---- | ----------- |
| `zoned` | Defines if this cloud provider is zones. If not provided defaults to `true` |
| `shoot.specTemplate` | Add default `shoot.spec` template. The provided yaml values are added to each new shoot resource. The worker CIDR can be used as as variable `${workerCIDR}` |
| `secret.fields` | Define secret input fields. See below for more details. If not provided, defaults to plain yaml object input |
| `secret.help` | `HTML` secret dialog help content |

> **_NOTE:_**  It is currently not possible to add custom DNS Providers. Only infrastructure providers are supported



### Secret Fields
It is possible to define input fields with data validation to help the user add secret data for this custom cloud provider. The array can contain field definitions with the following properties:
| name | description |
| ---- | ----------- |
| `key` | Unique key for input field. Used as secret data key |
| `hint` | Input field hint |
| `label` | Input field label |
| `type` | Input field type. Supported values are `text \| password \| json \| yaml` <br /> `text`: Simple plain text input<br /> `password`: Hidden secret data plain text input <br /> `json`: Object data in JSON format<br /> `yaml`: Object data in YAML input |
| `validators` | Add a key for each validation. Each validator has a `type` property as well as additional properties depending on the type. See below for possible valdation properties |
| `validationErrors` | For each key defined in `validations` add a key with an error message for the validation |

#### Validators
| type | properties | description |
| ---- | ---------- | ----------- |
| `required` | `not`: Optional array of field keys. Makes field required if one of the referenced input fields is empty. If `not` is not provided, the field is always required | Required input field. Use `not` references to ceate *either or* scenarios, e.g. `username / password` *or* `token` is required |
| `regex` | `value`: JavaScript regex pattern | Input field must match provided pattern. You can define arbitrary validations. e.g. length or specific syntax |
| `isValidObject` | `none` | Input value must be valid object. Can be used for `json` and `yaml` field types to ensure valid data |
> **_NOTE:_**  It is currently not possible to define custom input fields on the create cluster page

### Example
A complete custom cloud provider configuration example including required available cloud provider configuration as well as vendor configuration:

```yaml
global:
  dashboard:
    frontendConfig:
      cloudProviderList:
      - aws
      - my-cc
      - gcp
      customCloudProviders:
        my-cc:
          zoned: true
          shoot:
            specTemplate:
              provider:
                type: my-cc
                infrastructureConfig:
                  apiVersion: my-cc.provider.extensions.gardener.cloud/v1alpha1
                  kind: InfrastructureConfig
                  networks:
                    vpc:
                      cidr: ${workerCIDR}
                controlPlaneConfig:
                  apiVersion: my-cc.provider.extensions.gardener.cloud/v1alpha1
                  kind: ControlPlaneConfig
              networking:
                nodddes: ${workerCIDR}
          secret:
            fields:
            - key: project
              hint: Enter a valid project
              label: Project
              type: text
              validators:
                required:
                  type: required
                isproject:
                  type: regex
                  value: .+.+--.+
              validationErrors:
                required: Project is required
                isproject: Must be a valid project with format a--b
            - key: token
              hint: Enter a valid token
              label: Token
              type: password
              validators:
                required:
                  type: requiredIf
                  not:
                    - user
                    - password
                istoken:
                  type: regex
                  value: ^.{10}$
              validationErrors:
                required: Token is required if no user / password provided
                istoken: Must be a valid token with length 10
            - key: user
              hint: Enter a valid User
              label: User
              type: text
              validators:
                required:
                  type: requiredIf
                  not:
                    - token
              validationErrors:
                required: User is required if no token provided
            - key: password
              hint: Enter a password
              label: password
              type: password
              validators:
                required:
                  type: requiredIf
                  not:
                    - token
              validationErrors:
                required: Password is required if no token provided
            - key: json
              hint: Enter additional Data as JSON
              label: JSON
              type: json
              validators:
                isJSON:
                  type: isValidObject
              validationErrors:
                isJSON: Data must be valid JSON
            - key: yaml
              hint: Enter additional Data as YAML
              label: YAML
              type: yaml
              validators:
                isYAML:
                  type: isValidObject
              validationErrors:
                isYAML: Data must be valid YAML
            help: |
              #My Custom Cloud Provider
              <br />
              <img src="/static/vendor-assets/cp_my-cc.jpg" width="100px" />
              <br />
              ## Project
              Please enter a valid project with format a--b
              <br />
              ## Token
              Please enter a valid token with exactly 10 chars
      vendors:
        my-cc:
          name: My CC
          icon: cp_my-cc.jpg
```

## Vendor assets
In the above example, the vendor icon is referenced as static asset. Static vendor assets can be provided in the [assets](https://github.com/gardener/dashboard/tree/master/frontend/public/static/vendor-assets) folder when using the [helm chart](https://github.com/gardener/dashboard/blob/master/charts/gardener-dashboard) in the `frontendConfig.vendorAssets` map.

The files have to be encoded as base64 for the chart. For more information, see [Logos and Icons](customization.md#logos-and-icons) section of customization documentation.
