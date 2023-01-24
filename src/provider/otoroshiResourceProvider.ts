import * as pulumi from '@pulumi/pulumi'

import * as deepObjectDiff from 'deep-object-diff'
import { enums, inputs } from '../types'
import { getResourceLoaded, handle, tryFetch } from '../utils'

/**
 * Class OtoroshiResourceProvider describe how Pulumi should interact with Otoroshi for CRUD operations
 */
export class OtoroshiResourceProvider<Type extends inputs.Provider.mandatoryInputs>
    implements pulumi.dynamic.ResourceProvider
{
    async create(inputs: Type): Promise<pulumi.dynamic.CreateResult> {
        const operation = inputs.__import ? 'import' : 'create'
        let responseBody: any = undefined
        let outs: pulumi.Inputs = {}

        /**
         * Different behavior for import (GET) and create (POST)
         */
        switch (operation) {
            case 'import': {
                pulumi.log.debug(`import ${inputs.resourceId} (${inputs.kind})`)
                responseBody = await tryFetch<any>({
                    url: `${inputs.__endpoint}${enums.Otoroshi.Endpoints[inputs.kind]}/${inputs.resourceId}`,
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                })
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { __import, ...inputsReduced } = inputs
                outs = inputsReduced
                break
            }
            case 'create': {
                pulumi.log.debug(`create ${inputs.resourceId} (${inputs.kind})`)
                responseBody = await tryFetch<any>({
                    url: `${inputs.__endpoint}${enums.Otoroshi.Endpoints[inputs.kind]}`,
                    method: 'POST',
                    body: await getResourceLoaded(inputs),
                    headers: { 'Content-Type': 'application/json' },
                })
                outs = inputs
                break
            }
            default: {
                throw new Error(`Unsupported operation during resource create : ${operation}`)
            }
        }

        // Compare user inputs with resource response body
        await handle.compareResponseBody(inputs, responseBody)

        return {
            id: handle.getIdResponseBody(inputs.kind, responseBody),
            outs,
        }
    }

    async update(id: pulumi.ID, olds: Type, news: Type): Promise<pulumi.dynamic.UpdateResult> {
        pulumi.log.debug(`update ${id} (${news.kind})`)
        /**
         * Deconstruct olds and news object to remove __provider and __endpoint from comparison
         */
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { __provider: olds__provider, __endpoint: olds__endpoint, ...oldsLight } = olds
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { __provider: news__provider, __endpoint: news__endpoint, ...newsLight } = news

        /**
         * Testing for changes in inputs allow to update the Otoroshi __endpoint without API calling
         */
        const changes = JSON.stringify(oldsLight) === JSON.stringify(newsLight) ? false : true

        if (changes) {
            const responseBody = await tryFetch<any>({
                url: `${news.__endpoint}${enums.Otoroshi.Endpoints[news.kind]}/${id}`,
                method: 'PUT',
                body: await getResourceLoaded(news),
                headers: { 'Content-Type': 'application/json' },
            })

            await handle.compareResponseBody(news, responseBody)

            return {
                outs: news,
            }
        } else {
            return {
                outs: {
                    ...olds,
                    __endpoint: news.__endpoint,
                },
            }
        }
    }

    async diff(id: pulumi.ID, olds: Type, news: Type): Promise<pulumi.dynamic.DiffResult> {
        pulumi.log.debug(`diff ${id} (${news.kind})`)

        /**
         * Detect changes :
         * - deepObjectDiff.diff => Added keys, modified values
         * - keys number for => Deleted keys
         */
        const diff = deepObjectDiff.diff(olds, news)
        const changes =
            JSON.stringify(diff) === '{}' && Object.keys(olds).length === Object.keys(news).length ? false : true

        // Id change trigger a replace (and a delete will happen before replace)
        const replaces = 'resourceId' in diff ? ['resourceId'] : []

        return { changes, replaces, deleteBeforeReplace: true }
    }

    async check(olds: Type, news: Type): Promise<pulumi.dynamic.CheckResult> {
        const failures: pulumi.dynamic.CheckFailure[] = []

        if (typeof news.__import !== 'undefined' && JSON.stringify(olds) !== '{}')
            failures.push({
                property: '__import',
                reason: 'An existing Pulumi resource cannot be imported (it already has). You must remove metadata.import from the resource definition',
            })
        return {
            failures,
        }
    }

    async read(id: pulumi.ID, props: Type): Promise<pulumi.dynamic.ReadResult> {
        pulumi.log.debug(`read ${id} (${props.kind})`)

        const responseBody = await tryFetch<any>({
            url: `${props.__endpoint}${enums.Otoroshi.Endpoints[props.kind]}/${id}`,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            allowedResponseStatusCodes: [404],
        })

        const entityNotFound = responseBody['error_description'] == 'entity not found' ? true : false
        let result: pulumi.dynamic.ReadResult | undefined = undefined

        if (entityNotFound) {
            pulumi.log.warn(`Resouce ${id} not found in provider. Cannot read properties`)
            result = {
                id,
                props,
            }
        } else {
            const propsLocal: pulumi.Inputs = {}
            propsLocal['resourceId'] = props.resourceId
            propsLocal['__endpoint'] = props.__endpoint
            propsLocal['kind'] = props.kind

            /**
             * Update only existing resource properties
             */
            const excludeKeys = ['__provider', '__endpoint', 'kind', 'resourceId']
            Object.keys(props).forEach((key) => {
                if (!excludeKeys.includes(key)) {
                    if (responseBody[key] === undefined) {
                        throw new Error(`Cannot find ${key} in Otoroshi resource ${id}`)
                    }
                    propsLocal[key] = responseBody[key]
                }
            })

            result = {
                id: handle.getIdResponseBody(props.kind, responseBody),
                props: propsLocal,
            }
        }

        return result
    }

    async delete(id: pulumi.ID, props: Type) {
        pulumi.log.debug(`delete ${id}`)
        await tryFetch<any>({
            url: `${props.__endpoint}${enums.Otoroshi.Endpoints[props.kind]}/${id}`,
            method: 'DELETE',
            allowedResponseStatusCodes: [404],
        })
    }
}
