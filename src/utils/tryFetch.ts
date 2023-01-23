import fetch from 'node-fetch'

/**
 * Interfaces
 */
export interface Headers {
    [key: string]: string
}

export interface tryQueryArgs {
    /**
     * URL to query
     */
    url: string
    /**
     * HTTP method to use
     */
    method: string
    /**
     * Optional request body
     */
    body?: string
    /**
     * Optional headers to use
     */
    headers?: Headers
    /**
     * Disable throwning error on given non-ok status codes
     */
    allowedResponseStatusCodes?: number[]
}

/**
 * Generic fetch that can be used to fetch any kind of data from Otoroshi provider
 * Credentials are retrieve from environment to avoid writing them to the pulumi stack
 * @param args inputs for the fetch call
 */
export async function tryFetch<ResultType>(args: tryQueryArgs): Promise<ResultType> {
    if (!process.env.OTOROSHI_CLIENT_ID) {
        throw new Error(`Error: environment variable OTOROSHI_CLIENT_ID is not set`)
    }

    if (!process.env.OTOROSHI_CLIENT_SECRET) {
        throw new Error(`Error: environment variable OTOROSHI_CLIENT_SECRET is not set`)
    }
    const otoroshiCreds: Headers = {
        'Otoroshi-Client-Id': process.env.OTOROSHI_CLIENT_ID.trim(),
        'Otoroshi-Client-Secret': process.env.OTOROSHI_CLIENT_SECRET.trim(),
    }

    const allowedStatusCodeLocal: number[] = args.allowedResponseStatusCodes || []

    return fetch(args.url, {
        method: args.method,
        body: args.body,
        headers: {
            ...otoroshiCreds,
            ...args.headers,
        },
        timeout: 20000, // ms
    })
        .then(async (response) => {
            if (!response.ok && !allowedStatusCodeLocal.includes(response.status)) {
                throw new Error(
                    `Failed to ${args.method} ${args.url} - returned code ${response.status} (${response.statusText})\nRequest Body:${args.body}`,
                )
            }
            return await response.json()
        })
        .catch((error: Error) => {
            throw new Error(`Fetch cannot complete\n${error.message}`)
        })
}
