<div align="center">
  <h1>Pulumi Dynamic Provider for Otoroshi</h1>
🛠

Manage **<a href="https://maif.github.io/otoroshi" target="_blank">Otoroshi</a>** resources (Services, Apikeys, etc...) through **<a href="https://www.pulumi.com" target="_blank">Pulumi</a>**.

</div>

<hr />

[![Build Status](https://github.com/MAIF/pulumi-dynamic-provider-otoroshi/actions/workflows/ci.yaml/badge.svg)](https://github.com/MAIF/pulumi-dynamic-provider-otoroshi/actions/workflows/ci.yaml)
[![version](https://img.shields.io/npm/v/@maif/pulumi-dynamic-provider-otoroshi.svg?style=flat-square)](https://www.npmjs.com/package/@maif/pulumi-dynamic-provider-otoroshi)
[![downloads](https://img.shields.io/npm/dm/@maif/pulumi-dynamic-provider-otoroshi.svg?style=flat-square)](https://npm-stat.com/charts.html?package=@maif/pulumi-dynamic-provider-otoroshi&from=2023-01-25)
[![GitHub last commit](https://img.shields.io/github/last-commit/MAIF/pulumi-dynamic-provider-otoroshi.svg)](https://github.com/MAIF/pulumi-dynamic-provider-otoroshi/commits/master)
[![Apache-2.0](https://img.shields.io/npm/l/@maif/pulumi-dynamic-provider-otoroshi.svg?style=flat-square)](https://github.com/MAIF/pulumi-dynamic-provider-otoroshi/blob/master/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

This tool allow to define resource in YAML format and provide a GitOps management approach.

## Installation

### Create a new pulumi project

See <a href="https://www.pulumi.com/docs/intro/languages/javascript/#typescript" target="_blank">Pulumi official documentation</a>

### Install package

To use from JavaScript or TypeScript in Node.js, install using either `npm` :

    npm install @maif/pulumi-dynamic-provider-otoroshi

or `yarn`:

    yarn add @maif/pulumi-dynamic-provider-otoroshi

### Create a new stack

Create a new Pulumi stack :

    pulumi stack init dev

And the configuration file **Pulumi.dev.yaml** with your Otoroshi URL in `otoroshi:endpoint`.

Exemple :

```yaml
config:
  otoroshi:endpoint: http://otoroshi-api.oto.tools:8080
```

### Use the provider

Modify the **index.ts** created by Pulumi with the following :

```typescript
import { ResourceFileReader } from '@maif/pulumi-dynamic-provider-otoroshi'
import { resolve } from 'path'
import * as pulumi from '@pulumi/pulumi'

const myReader = new ResourceFileReader({ assetsRelativeFolder: resolve(__dirname, `../conf/${pulumi.getStack()}`) })

myReader.run()

export const otoroshiResources = myReader.getResourcesCreatedByKind()
```

Give it the PATH to your YAML resources folder as `assetsRelativeFolder`. Create a folder for each stack inside **conf** (ex: /conf/dev, /conf/preprod, etc...). Subdirectories of the PATH you provided will be scanned as well.


## Configure credentials

Credentials are not stored in pulumi stack or in code. You must set them as environement variables.

> Use an Otoroshi apikey with enough privileges to create/request/update/delete resources.

```shell
# Windows
set OTOROSHI_CLIENT_ID=admin-api-apikey-id
set OTOROSHI_CLIENT_SECRET=admin-api-apikey-secret
# Linux
export OTOROSHI_CLIENT_ID=admin-api-apikey-id
export OTOROSHI_CLIENT_SECRET=admin-api-apikey-secret
```

## Usage

```shell
pulumi stack select dev
pulumi preview
pulumi up
```

## YAML Configurations examples

Each Otoroshi resource is defined by an individual YAML file. The **filename** will be used to name the resource in the Pulumi state : **you should use unique and relevant names**. You can organize folder and subfolders as you like.

For example, see [./conf/test](./conf/test/)

### Create minimal resources

**Mandatory** attributes are :

- GlobalConfig: **kind**, **spec.otoroshiId**
- ApiKey: **kind**, **spec.clientId** and **spec.clientName**
- Others kinds: **kind**, **spec.id** and **spec.name**

All attributes not provided wil be populated with default values.

```yaml
kind: Tenant
spec:
  id: tenantyaml
  name: tenantyaml
```

### Create full resources

You can also export existing resource from Otoroshi UI with the YAML button present on each resource.

```yaml
apiVersion: proxy.otoroshi.io/v1
kind: Tenant
metadata:
  name: tenantyaml
spec:
  id: tenantyaml
  name: tenantyaml
  description: Default organization created with Pulumi
  metadata: {}
  tags: []
```

### Import resources

> For those who know the command `pulumi import`, it is not natively supported in dynamic provider (See <a href="https://github.com/pulumi/pulumi/issues/7534" target="_blank">pulumi/pulumi issue#7534</a>). An alternative solution is implemented.

This mecanism allow to read a real resource and write to the Pulumi State. When importing, it is only reading on the provider.

**GlobalConfig** cannot be imported. It does not need to. You can export your existing GlobalConfig and it will override tbe existing one.

To import a resource, you must:

- export resource from Otoroshi as **YAML**
- add the property **metadata.import** and set the value `true`
- after the import, you **must** remove the property **metadata.import**

See the example [import-default-organization.yaml](./conf/test/import/import-default-organization.yaml) :
```yaml
apiVersion: proxy.otoroshi.io/v1alpha1
kind: Organization
metadata:
  name: default-organization
  import: true
spec:
  id: default
  name: Default organization
  description: The default organization
  metadata: {}
  tags: []
```

### Refresh resources

Pulumi can compares the current known resources (i.e. : wanted state) with the real Otoroshi resource (i.e.: real state). When doing so, any changes are adopted into the current stack. It is a great tool to detect **configuration drift**.

Note that this command will **NOT** update YAML files in your git repo. You **MUST** updated them manually. If you do not, subsequent updates may still appear to be out of sync with respect to the Otoroshi source of truth.

```shell
pulumi refresh
```

## Handle sensitive information

Since every resource configuration is stored in git, you cannot specify **confidentials informations** (i.e.: secrets, password, token, etc...).
It is better to use an external vault to store them and use reference in Otoroshi.

Follow this documentation to configure and enable <a href="https://maif.github.io/otoroshi/manual/topics/secrets.html" target="_blank">secrets management</a> in Otoroshi.

After setting up, you can use reference instead of confidential information (See link above for reference format).

```yaml
# Classic definition
kind: ApiKey
spec:
  clientId: minimal-apikey
  clientName: minimal-apikey
  clientSecret: confidentialPassThatShouldNotBeVisible

# Azure Keyvault reference to the secret name otoroshi-apikey-minimal-apikey, version latest
kind: ApiKey
spec:
  clientId: minimal-apikey
  clientName: minimal-apikey
  clientSecret: ${vault://azurevault/otoroshi-apikey-minimal-apikey/latest}
```

## ResourceFileReader options

AJV validation schema ensure that mandatory attributes are presents. It is _enable by default_, but you can disable it with **doValidate**.

You can customise resource kind creating order with **sortOrder**. A [default sorting order](./src/components/resourceFileReader.ts#L62) is already set to prevent dependencies issues.

```typescript
const myReader = new ResourceFileReader({
  doValidate: false,
  sortOrder: ['ServiceGroup', 'ApiKey'],
})
```

## Performances

Time to manage 50 organizations, 50 services and 100 Api Keys (using a local Pulumi stack) :

- creation : 5 minutes (preview: 59s, up: 4min16s)
- update (1 resource) : ~1 minutes (preview: 59s, up: 5s)
- update (10 resource) : ~1 minutes (preview: 59s, up: 10s)
- update (100 resource) : ~3 minutes (preview: 59s, up: 2min7s)
- delete (1 resource) : ~1 minutes (preview: 59s, up: 5s)
- delete (10 resource) : ~1 minutes (preview: 59s, up: 10s)
- delete (100 resource) : ~4 minutes (preview: 59s, up: 3min30s)

Writing time to the pulumi stack is impacted by the concept of dynamic provider : the provider code is serialize into **each** resources in the attribute.
**\_\_provider**. See <a href="https://www.pulumi.com/docs/intro/concepts/function-serialization" target="_blank">Pulumi Function Serialization</a> for more informations.

## Roadmap

- Better handle the case of diff after doing a `pulumi refresh` with reals modifications. Actually you can only see that the resource need to be update (but not which attribute(s)). We need to be able to show comparison of differents attributes.

## Limitations

- Otoroshi resource kind `Admin` (local admin) cannot be created with this solution (for now)
- Otoroshi experimentals resources cannot be created (`error-templates`, `route-compositions`, `tunnels`, etc...) (for now)

## Workaround

- **\_\_provider** : If some changes are done on the provider code, do `pulumi up` before doing any changes on the resources. It force the serialized provider (_\_\_provider_ in the pulumi state) informations to be updated for exising resouces. It is good pratice to avoid doing resources modification at the same time.
- Created ressource from the provider have only the **id** readable. It's because the provider has a generic and minimal implementation. It's do not know all attributes of all resources
- **pulumi import** is not natively supported (See <a href="https://github.com/pulumi/pulumi/issues/7534" target="_blank">pulumi/pulumi issue#7534</a>). An alternative solution is implemented, See section [Import existing resources](#Import-existing-resources).
