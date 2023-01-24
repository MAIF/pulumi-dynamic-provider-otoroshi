import * as pulumi from '@pulumi/pulumi'

import * as deepObjectDiff from 'deep-object-diff'
import { inputs } from '../types'
import { handle } from './'

/**
 * Extract resource ID from an Otoroshi response
 * @param kind Otoroshi Resource Kind
 * @param responseBody Otoroshi Response
 * @returns resource id
 */
export function getIdResponseBody(kind: string, responseBody: any): string {
    switch (kind) {
        case 'ApiKey': {
            return responseBody.clientId
        }
        case 'GlobalConfig': {
            return responseBody.otoroshiId
        }
        default: {
            if (!('id' in responseBody)) {
                throw new Error(`Cannot get id from resource ${kind}\nResponseBody: ${JSON.stringify(responseBody)}`)
            }
            return responseBody.id
        }
    }
}

/**
 * Prepare the id in the body content to send to Otoroshi Resource Loaded
 * @param id resource id
 * @param inputs resource infos
 * @returns prepared body content
 */
export function prepareBodyContent(id: string, inputs: any): any {
    switch (inputs.kind) {
        case 'ApiKey': {
            return inputs
        }
        case 'GlobalConfig': {
            return inputs
        }
        default: {
            return {
                id,
                ...inputs,
            }
        }
    }
}

interface extractInputsResult {
    id: string
    inputs: pulumi.Inputs
}

/**
 * Standardise ID from various kind (user input) by
 * @param args user inputs
 * @returns adapt
 */
export function extractInputs(args: inputs.Resource.PulumiInputs): extractInputsResult {
    switch (args.kind) {
        case 'ApiKey': {
            return { id: args.spec.clientId, inputs: args.spec }
        }
        case 'GlobalConfig': {
            return { id: args.spec.otoroshiId, inputs: args.spec }
        }
        default: {
            const { id, ...inputs } = args.spec
            return { id, inputs }
        }
    }
}

/**
 * Compare user inputs with an existing resource
 * @param inputs inputs provided by the user to create the resource
 * @param responseBody existing resource attributes
 */
export async function compareResponseBody<Type extends inputs.Provider.mandatoryInputs>(
    inputs: Type,
    responseBody: any,
): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __provider, __endpoint, __import, resourceId, ...inputsReduced } = inputs
    const inputsReducedd = handle.prepareBodyContent(resourceId, inputsReduced)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { kind, ...inputsToCompare } = inputsReducedd

    const diff = JSON.stringify(deepObjectDiff.diff(responseBody, inputsToCompare))
    if (diff !== '{}') {
        throw new Error(`The resource ${resourceId} of kind ${inputs.kind} has non-identicals keys. See below\n${diff}`)
    }
}
