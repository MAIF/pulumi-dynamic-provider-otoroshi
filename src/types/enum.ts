export interface Dict {
    [name: string]: string
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Otoroshi {
    // prettier-ignore
    export const Kind = {
        ApiKey: 'ApiKey',
        Backend: 'Backend',
        AuthModule: 'AuthModule',
        Certificate: 'Certificate',
        DataExporter: 'DataExporter',
        GlobalConfig: 'GlobalConfig',
        JwtVerifier: 'JwtVerifier',
        Route: 'Route',
        Script: 'Script',
        ServiceDescriptor: 'ServiceDescriptor',
        ServiceGroup: 'ServiceGroup',
        TcpService: 'TcpService',
        Team: 'Team',
        Organization: 'Organization',
    }
    export type Kind = { [key in keyof typeof Kind]: string }
    // prettier-ignore
    export const Endpoints : Dict = {
        ApiKey: '/api/apikeys',
        Backend: '/api/backends',
        AuthModule: '/api/auths',
        Certificate: '/api/certificates',
        DataExporter: '/api/data-exporter-configs',
        GlobalConfig: '/api/globalconfig',
        Organization: '/api/tenants',
        JwtVerifier: '/api/verifiers',
        Script: '/api/scripts',
        Route: '/api/routes',
        ServiceDescriptor: '/api/services',
        ServiceGroup: '/api/groups',
        TcpService: '/api/tcp/services',
        Team: '/api/teams',
    }
    export type Endpoints = { [key in keyof typeof Endpoints]: string }
}
