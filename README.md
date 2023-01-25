<div align="center">
  <h1>Pulumi Dynamic Provider for Otoroshi</h1>
🛠

Manage **[Otoroshi](https://maif.github.io/otoroshi/)** resources (Services, Apikeys, etc...) through **[Pulumi](https://www.pulumi.com)**.

</div>

<hr />

[![Build Status](https://github.com/MAIF/pulumi-dynamic-provider-otoroshi/actions/workflows/ci.yaml/badge.svg)](https://github.com/MAIF/pulumi-dynamic-provider-otoroshi/actions/workflows/ci.yaml)
[![version](https://img.shields.io/npm/v/@maif/pulumi-dynamic-provider-otoroshi.svg?style=flat-square)](https://www.npmjs.com/package/@maif/pulumi-dynamic-provider-otoroshi)
[![downloads](https://img.shields.io/npm/dm/@maif/pulumi-dynamic-provider-otoroshi.svg?style=flat-square)](https://npm-stat.com/charts.html?package=@maif/pulumi-dynamic-provider-otoroshi&from=2023-01-25)
[![Apache-2.0](https://img.shields.io/npm/l/@maif/pulumi-dynamic-provider-otoroshi.svg?style=flat-square)](https://github.com/MAIF/pulumi-dynamic-provider-otoroshi/blob/master/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

This tool allow to define resource in YAML format and provide a GitOps management approach.

## Installation

### Requirement

- Pulumi & Typescript
- Deployed and working Otoroshi (at least 1.5.18)
- Otoroshi Apikey to manage resources (and enough privileges)

### Create a new pulumi project

Create a new Pulumi project and install the library

```shell
pulumi new typescript -y --dir my_project_dir
cd my_project_dir
npm install @maif/pulumi-dynamic-provider-otoroshi
```

### Create a new stack

Create a new Pulumi stack and the configuration file (Ex : **Pulumi.dev.yaml**). Set your Otoroshi URL in `otoroshi:endpoint`

```yaml
config:
  otoroshi:endpoint: http://otoroshi-api.oto.tools:8080
```

### Use the dynamic provider

Modify the **index.ts** created by Pulumi with the following. Give it the PATH to your YAML resources folder as `assetsRelativeFolder`. Create a folder for each stack inside **conf** (ex: /conf/dev, /conf/preprod, etc...). Subdirectories of the PATH you provided will be scanned as well.

```typescript
import { ResourceFileReader } from '@maif/pulumi-dynamic-provider-otoroshi'
import { resolve } from 'path'
import * as pulumi from '@pulumi/pulumi'

const myReader = new ResourceFileReader({ assetsRelativeFolder: resolve(__dirname, `../conf/${pulumi.getStack()}`) })

myReader.run()

export const otoroshiResources = myReader.getResourcesCreatedByKind()
```

## Configure credentials

Credentials are not stored in pulumi stack or in code, you must set them as environement variables

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

Each resource must be define in an individual file. The **filename** will be used to name the resource in the Pulumi state : **you should use unique and relevant names**. But you can organize folder and subfolders as you like.

For an example, see [./conf/test](./conf/test/)

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

You can also export existing resource from Otoroshi by clicking on the YAML button on resource UI.

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

> For those who know the command `pulumi import`, it is not natively supported in dynamic provider (See [pulumi/pulumi issue#7534](https://github.com/pulumi/pulumi/issues/7534)). An alternative solution is implemented.

This mecanism allow to read a real resource and write to the Pulumi State. When importing, it is only reading on the provider.

To import a resource, you must:

- export resource from Otoroshi as **YAML**
- add the property **metadata.import** and set the value `true`
- after the import, you **must** remove the property **metadata.import**

For an example, see [import-default-organization.yaml](./conf/test/import/import-default-organization.yaml)

**GlobalConfig** cannot be imported. It does not need to. You can export your existing GlobalConfig and it will override tbe existing one.

### Refresh resources

Pulumi can compares the current known resources (i.e. : wanted state) with the real Otoroshi resource (i.e.: real state). When doing so, any changes are adopted into the current stack. It is a great tool to detect **configuration drift**.

Note that this command will **NOT** update YAML files in your git repo. You **MUST** updated them manually. If you do not, subsequent updates may still appear to be out of sync with respect to the Otoroshi source of truth.

```shell
pulumi refresh
```

## Handle sensitive information

Since every resource configuration is stored in git, you cannot specify **confidentials informations** (i.e.: secrets, password, token, etc...).
It is better to use an external vault to store them and use reference in Otoroshi.

Follow this documentation to configure and enable [secrets management](https://maif.github.io/otoroshi/manual/topics/secrets.html) in Otoroshi.

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
**\_\_provider**. See [Pulumi Function Serialization](https://www.pulumi.com/docs/intro/concepts/function-serialization) for more informations.

## Roadmap

- Better handle the case of diff after doing a `pulumi refresh` with reals modifications. Actually you can only see that the resource need to be update (but not which attribute(s)). We need to be able to show comparison of differents attributes.

## Limitations

- Otoroshi resource kind `Admin` (local admin) cannot be created with this solution (for now)
- Otoroshi experimentals resources cannot be created (`error-templates`, `route-compositions`, `tunnels`, etc...) (for now)

## Workaround

- **\_\_provider** : If some changes are done on the provider code, do `pulumi up` before doing any changes on the resources. It force the serialized provider (_\_\_provider_ in the pulumi state) informations to be updated for exising resouces. It is good pratice to avoid doing resources modification at the same time.
- Created ressource from the provider have only the **id** readable. It's because the provider has a generic and minimal implementation. It's do not know all attributes of all resources
- **Dynamic Provider Ressource Type** : Pulumi resources are created with the same type **pulumi-nodejs:dynamic:Resource**. It's hardcoded in the dynamic provider abstract class (See [pulumi/pulumi nodejs/dynamic/index.ts#L204](https://github.com/pulumi/pulumi/blob/master/sdk/nodejs/dynamic/index.ts#L204)). It's a known current limitation (See [pulumi/pulumi issue#9434](https://github.com/pulumi/pulumi/issues/9434)).
- **pulumi import** is not natively supported (See [pulumi/pulumi issue#7534](https://github.com/pulumi/pulumi/issues/7534)). An alternative solution is implemented, See section [Import existing resources](#Import-existing-resources)