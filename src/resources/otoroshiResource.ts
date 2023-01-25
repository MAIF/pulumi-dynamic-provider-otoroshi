import * as pulumi from '@pulumi/pulumi'

import { OtoroshiGlobalConfigProvider, OtoroshiResourceProvider } from '../provider'
import { enums, inputs } from '../types'
import { handle } from '../utils'

export class OtoroshiResource extends pulumi.dynamic.Resource {
    /**
     * Create an Otoroshi resource with the given unique name, arguments, and options.
     * @param name — The unique name of the resource.
     * @param args — The arguments to use to populate this resource's properties.
     * @param opts — A bag of options that control this resource's behavior.
     */
    constructor(name: string, args: inputs.Resource.PulumiInputs, opts?: pulumi.ResourceOptions) {
        pulumi.all([args.kind]).apply(([kind]) => {
            if (!Object.keys(enums.Otoroshi.Endpoints).includes(kind as string))
                throw new Error(
                    `Invalid kind: ${kind}. Must be one of ${Object.keys(enums.Otoroshi.Endpoints).join(', ')}`,
                )
        })

        const extracted = handle.extractInputs(args)

        const resourceInputs: pulumi.Inputs = extracted.inputs

        resourceInputs['kind'] = args.kind
        resourceInputs['resourceId'] = extracted.id
        resourceInputs['__endpoint'] =
            new pulumi.Config('otoroshi').get('endpoint') || 'http://otoroshi-api.oto.tools:8080'

        if (args.metadata && typeof args.metadata.import !== 'undefined') {
            pulumi.log.info(
                `The resource ${name} is marked for import. It will only create in Pulumi state. Data will be validated with a GET on Otoroshi`,
            )
            resourceInputs['__import'] = true
        }

        /**
         * resource kind `GlobalConfig` has a different behavior and need it's own provider
         */
        args.kind === 'GlobalConfig'
            ? super(new OtoroshiGlobalConfigProvider(), name, resourceInputs, opts)
            : super(new OtoroshiResourceProvider(), name, resourceInputs, opts)
    }
}
