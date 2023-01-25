import * as pulumi from '@pulumi/pulumi'

import * as deepObjectDiff from 'deep-object-diff'
import { enums, inputs } from '../types'
import { getResourceLoaded, handle, tryFetch } from '../utils'

/**
 *
 */
export class OtoroshiGlobalConfigProvider<Type extends inputs.Provider.mandatoryInputs>
    implements pulumi.dynamic.ResourceProvider
{
    async create(inputs: Type): Promise<pulumi.dynamic.CreateResult> {
        pulumi.log.debug(`create ${inputs.name} (${inputs.kind})`)

        await tryFetch<any>({
            url: `${inputs.__endpoint}${enums.Otoroshi.Endpoints['GlobalConfig']}`,
            method: 'PUT',
            body: await getResourceLoaded(inputs),
            headers: { 'Content-Type': 'application/json' },
        })

        return {
            id: inputs.resourceId,
            outs: inputs,
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
            await tryFetch<any>({
                url: `${news.__endpoint}${enums.Otoroshi.Endpoints['GlobalConfig']}`,
                method: 'PUT',
                body: await getResourceLoaded(news),
                headers: { 'Content-Type': 'application/json' },
            })

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

        return { changes }
    }

    async read(id: pulumi.ID, props: Type): Promise<pulumi.dynamic.ReadResult> {
        pulumi.log.debug(`read ${id} (${props.kind})`)
        const responseBody = await tryFetch<any>({
            url: `${props.__endpoint}${enums.Otoroshi.Endpoints['GlobalConfig']}`,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

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
                propsLocal[key] = responseBody[key]
            }
        })

        return {
            id: handle.getIdResponseBody(props.kind, responseBody),
            props: propsLocal,
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async delete(id: pulumi.ID, props: Type) {
        pulumi.log.debug(`delete ${id}`)
        pulumi.log.warn(`Cannot delete GlobalConfig from Otoroshi. Will ony delete ${id} from Pulumi state`)
    }
}
