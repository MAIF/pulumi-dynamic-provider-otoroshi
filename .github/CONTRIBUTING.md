# Contribuer

Even without [devcontainer](https://containers.dev), you can still read files in the folder **.devcontainer** to understand the needs for development

## Quickly deploy a dev environment based on devcontainer

You can quickly deploy a full dev environment with [Visual Studio Code Remote - Containers extension](https://code.visualstudio.com/docs/remote/containers).

You need **docker** and **docker-compose** on your computer, then :

- Install [vscode extension Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- Set environment variable PULUMI_ACCESS_TOKEN in your computer (it will be passed to the dev container)
- Open the workspace with vscode
- On the bottom left, clic on the green icon **><** and _Reopen in container_
- All the dev environment will be spinup and the workspace mounted
- Enjoy !

## Useful CLI commands

### Install

```shell
npm i
```

### Build

```shell
# Linux / Mac
npm run build
# Windows (may need to create an empty folder named lib)
npm run build-win
```

### Test

#### Unit tests

```shell
npm run test
```

#### Integration tests

To access Otoroshi admin UI on <http://otoroshi.oto.tools:8080>, you need to override your local DNS. Edit the file:

- Linux / Mac : /etc/hosts
- Windows : C:\Windows\System32\drivers\etc\hosts with the following

```text
127.0.0.1 otoroshi-api.oto.tools
127.0.0.1 otoroshi.oto.tools
```

Then you can go into pulumi-tests folder to start loading configuration in Otoroshi

```shell
cd pulumi-tests

pulumi login
pulumi stack init dev
pulumi preview
pulumi up
pulumi refresh
pulumi destroy
```

### Reset working environment

- reboot Otoroshi (config is stored in-memory)
- delete your pulumi stack `pulumi stack rm dev --yes --force`
- create a new pulumi stack `pulumi stack init dev`

## Versionning

To release a new version use `npm version.` Changes are automatically added in [CHANGELOG.md](./CHANGELOG.md) based on git history.

```bash
npm version patch
npm version minor
npm version major
```

## Continuous integration

Every commit and PR are built, unit tested and integration tested in [Github Actions](https://github.com/MAIF/pulumi-dynamic-provider-otoroshi/actions). 

## Reference

- [Github - Otoroshi](https://github.com/MAIF/otoroshi)
- [Github - pulumi@pulumi - Node JS Dynamic provider class definition](https://github.com/pulumi/pulumi/blob/master/sdk/nodejs/dynamic/index.ts#L204)
- [Youtube - Pulumi Dynamic Provider starter pack](https://www.youtube.com/watch?v=H4nehfvCLm8)
- [Github - fauna-pulumi-provider](https://github.com/TriangularCube/fauna-pulumi-provider)
- [Doc - YAML Parser](https://eemeli.org/yaml/#api-overview)
- [Doc - AJV JSON schema validator documentation](https://ajv.js.org/json-schema.html)
- [Doc - Typescript spread tips and tricks](https://levelup.gitconnected.com/spreading-resting-and-renaming-properties-in-typescript-68fb35ffb1f)
