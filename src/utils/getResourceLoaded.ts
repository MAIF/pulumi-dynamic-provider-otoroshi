import * as deepObjectDiff from 'deep-object-diff'
import { inputs } from '../types'
import { handle, tryFetch } from './'

export interface ResourceLoadedResponse {
    created: {
        kind: string
        resource: any
    }
}

/**
 * Query Otoroshi Resource Loader to validate resource. This add default values for missing properties
 * @param inputs inputs provided by the user to create the resource
 * @returns resource info consolidated from Otoroshi Resource Loader
 */
export async function getResourceLoaded<Type extends inputs.Provider.mandatoryInputs>(inputs: Type): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __provider, __endpoint, resourceId, ...inputsReduced } = inputs

    const bodycontent = handle.prepareBodyContent(resourceId, inputsReduced)

    const inputsConsolidated = (
        await tryFetch<ResourceLoadedResponse>({
            url: `${inputs.__endpoint}/api/new/resources`,
            method: 'POST',
            body: JSON.stringify({ content: bodycontent }),
            headers: { 'Content-Type': 'application/json' },
        })
    ).created.resource

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { kind, ...inputsToCompare } = bodycontent

    const diff1 = JSON.stringify(deepObjectDiff.diff(inputsConsolidated, inputsToCompare), null, 2)

    if (diff1 !== '{}') {
        // Reverse diff to extract missing keys and value
        const diff2 = JSON.stringify(deepObjectDiff.diff(inputsToCompare, inputsConsolidated), null, 2)

        let message =
            `The resource ${resourceId} (kind ${inputs.kind}) has invalid inputs keys.` +
            `\n\nUser inputs: ${JSON.stringify(inputsToCompare)}` +
            `\n\nOtoroshi Response: ${JSON.stringify(inputsConsolidated)}`
        message += Object.values(diff1) ? `\n\nRefused config keys : ${diff1}` : ``
        message += Object.values(diff2) ? `\n\nMissing config keys : ${diff2}` : ``

        throw new Error(message)
    }

    return JSON.stringify(inputsConsolidated)
}
