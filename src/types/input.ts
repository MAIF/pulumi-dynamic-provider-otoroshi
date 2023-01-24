import * as pulumi from '@pulumi/pulumi'

import { enums } from './'

interface RessourceSpec {
    id: string
    name: string
    [key: string]: any
}

interface ApikeySpec {
    clientId: string
    clientName: string
    [key: string]: any
}

interface GlobalConfigSpec {
    otoroshiId: string
    [key: string]: any
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Resource {
    export interface Inputs {
        apiVersion?: string
        kind: string
        metadata?: {
            name?: string
            import?: boolean
        }
        spec: RessourceSpec | ApikeySpec | GlobalConfigSpec
    }

    export interface PulumiInputs {
        apiVersion?: pulumi.Input<string>
        kind: pulumi.Input<string> | pulumi.Input<enums.Otoroshi.Kind>
        metadata?: {
            name?: pulumi.Input<string>
            import?: pulumi.Input<boolean>
        }
        spec: RessourceSpec | ApikeySpec | GlobalConfigSpec
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Provider {
    export interface mandatoryInputs {
        /**
         * Resource Name
         */
        name: string
        /**
         * Resource Id
         */
        resourceId: string
        /**
         * Resource Kind
         */
        kind: string
        /**
         * Use during function create (import if true, creation if false)
         */
        __import?: boolean
        /**
         * Serialized provider (created by abstract class pulumi.dynamic.ResourceProvider)
         */
        __provider: string
        /**
         * Otoroshi endpoint
         */
        __endpoint: string
    }
}
