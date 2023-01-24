import * as pulumi from '@pulumi/pulumi'

import { existsSync, readFileSync } from 'fs'
import * as path from 'path'
import * as yaml from 'yaml'
import { OtoroshiResource } from '../resources'
import { inputs } from '../types'
import { readDirRecursiveSync } from '../utils'
import * as schema from '../utils/AjvValidator'

/**
 * Interfaces
 */
export interface ResourceFileReaderArgs {
    /**
     *
     */
    assetsRelativeFolder: string
    /**
     * Do Schema Validation of YAML files (default: true)
     */
    doValidate?: boolean
    /**
     * Define a custom sort order based on the kind of Otoroshi resources (default: see static KIND_SORT_ORDER)
     */
    sortOrder?: string[]
}

export interface validateArgs {
    /**
     * FilePath of file to validate
     */
    filePath: string
    /**
     * Data to validate
     */
    data: inputs.Resource.Inputs
}

export interface Files {
    data: inputs.Resource.Inputs
    filePath: string
    kind: string
}

export interface ResourcesCreatedOutput {
    [kind: string]: pulumi.Output<string>[]
}

export interface KindDependsOn {
    kind: string
    indexes: number[]
}

export interface KindsDependsOn {
    [kind: string]: KindDependsOn
}

export class ResourceFileReader {
    static ALLOWED_FILE_EXTENTIONS = ['.yaml', '.yml']
    static DO_VALIDATE = true
    static KIND_SORT_ORDER = [
        'GlobalConfig',
        'Organization',
        'Team',
        'ServiceGroup',
        'Admin',
        'Certificate',
        'AuthModule',
        'JwtVerifier',
        'DataExporter',
        'Script',
        'ServiceDescriptor',
        'Backend',
        'Route',
        'TcpService',
        'ApiKey',
    ]
    static REGEX_NAME_ALLOWED = '^([a-zA-Z0-9._-]+)$'

    readonly doValidate: boolean
    readonly sortOrder: string[]

    private assetsRelativeFolder: string
    private filesInput: Files[]
    private resourcesCreated: OtoroshiResource[]

    /**
     * pulumi DependsOn for kinds based on this.sortOrder
     */
    private kindsDependsOn: KindsDependsOn

    /**
     * Read Otoroshi resources declared as files
     * Structure of inputs files can be validated using AJV Validator
     * @returns instance of ResourceFileReader
     */
    public constructor(args: ResourceFileReaderArgs) {
        /**
         * Read args
         */
        this.assetsRelativeFolder = args.assetsRelativeFolder
        this.doValidate = args.doValidate || ResourceFileReader.DO_VALIDATE
        this.sortOrder = args.sortOrder || ResourceFileReader.KIND_SORT_ORDER
        this.resourcesCreated = []
        this.kindsDependsOn = {}

        /**
         * Load YAML files
         */
        const filesName = this.list(this.assetsRelativeFolder)
        this.filesInput = this.sortbyKind(this.read(filesName))
    }

    /**
     * Read, load files then create resources
     * @returns list of instances created
     */
    public run(): OtoroshiResource[] {
        return this.filesInput.map((fileData, curIndex) => {
            const name = this.extractName(fileData.filePath)
            const props = fileData.data
            const opts = this.definePulumiOpts(curIndex)

            const resource = new OtoroshiResource(name, props, opts)

            this.resourcesCreated.push(resource)
            return resource
        })
    }

    /**
     * Recursive list files in a directory and subdirectories and build a list of files
     * @param path relative path to the assets folder to read
     * @returns array of files fullPath
     */
    private list(folderPath: string): string[] {
        return existsSync(folderPath)
            ? readDirRecursiveSync(folderPath, ResourceFileReader.ALLOWED_FILE_EXTENTIONS)
            : []
    }

    /**
     * Read files and validate the content against the schema
     * @param filesPath list of files to read
     * @returns array of data,filePath and kind
     */
    private read(filesPath: string[]): Files[] {
        let unique_global_config = false

        return filesPath.map((filePath) => {
            const data: inputs.Resource.Inputs = yaml.parse(readFileSync(filePath, 'utf8'))
            if (this.doValidate) this.validate({ filePath, data })

            if (data.kind === 'GlobalConfig') {
                if (unique_global_config) {
                    throw new Error(`Error - Only one GlobalConfig is allowed`)
                }

                unique_global_config = true
            }

            return {
                filePath,
                kind: data.kind,
                data,
            }
        })
    }

    /**
     * Extract the name of the resource from the filePath and validate standard naming convention
     * @param filePath filePath or filename of future resource
     * @returns name of the future resource
     */
    private extractName(filePath: string): string {
        const name = path.parse(filePath).name

        const allowedPattern = new RegExp(ResourceFileReader.REGEX_NAME_ALLOWED)
        if (!allowedPattern.test(name))
            throw new Error(
                `Error - File ${filePath} contain invalid characters. Please use only alphanumeric, underscore and dash. You can valide with the following regex ${ResourceFileReader.REGEX_NAME_ALLOWED}`,
            )
        return name
    }

    /**
     * Sort resources by kind order define in sortOrder
     * @param Files array of data,filePath and kind
     * @returns sorted array Files
     */
    private sortbyKind(Files: Files[]): Files[] {
        const ordering: { [name: string]: number } = {} // map for efficient lookup of sortIndex
        for (let i = 0; i < this.sortOrder.length; i++) ordering[this.sortOrder[i]] = i

        return Files.sort(function (a, b) {
            return ordering[a.kind] - ordering[b.kind] || a.filePath.localeCompare(b.filePath)
        })
    }

    /**
     * Return Pulumi ResourceOptions with dependsOn on the previous kind resources
     * @param curIndex current position in the array
     * @returns valid Pulumi ResourceOptions object
     */
    private definePulumiOpts(curIndex: number): pulumi.ResourceOptions {
        const currentKind = this.filesInput[curIndex].kind
        const target =
            currentKind in this.kindsDependsOn
                ? this.kindsDependsOn[currentKind]
                : this.findPreviousKindIndexes(curIndex)

        return {
            dependsOn: target.indexes.map((index) => this.resourcesCreated[index]),
        }
    }

    /**
     * Find the previous kind resource closest and farest indexes to build Pulumi dependsOn attribute
     * @param curIndex current element position in the array
     * @returns a target kind
     */
    private findPreviousKindIndexes(curIndex: number): KindDependsOn {
        const currentKind = this.filesInput[curIndex].kind

        let lowerIndex: number | undefined = undefined
        let upperIndex: number | undefined = undefined

        const target: KindDependsOn = {
            kind: '',
            indexes: [],
        }

        /**
         * Find closest previous kind
         */
        for (let i = curIndex - 1; i >= 0; i--) {
            if (this.filesInput[i].kind !== currentKind) {
                target.kind = this.filesInput[i].kind
                upperIndex = i
                break
            }
        }

        /**
         * Find farest previous kind
         */
        if (upperIndex !== undefined) {
            for (let i = upperIndex - 1; i >= 0; i--) {
                if (target.kind !== currentKind) {
                    lowerIndex = i
                    break
                }
            }
        }

        if (upperIndex !== undefined) {
            // Handle only one previous kind
            if (lowerIndex === undefined) target.indexes.push(upperIndex)
            else {
                for (let i = lowerIndex; i <= upperIndex; i++) target.indexes.push(i)
            }
        }

        /**
         * Store the target kind for futures kind
         */
        this.kindsDependsOn[currentKind] = target
        return target
    }

    /**
     * Validate data against the assetType AJV schema
     * See src/assets/schemas for all declared schemas
     * @param args bag of arguments
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private validate(args: validateArgs): any {
        const customSchemaUsage = schema.schemascustom.includes(args.data.kind.toLowerCase())
        const schemaName = customSchemaUsage ? args.data.kind.toLowerCase() : 'resource'
        const validate = schema.validator.getSchema(schemaName)

        if (validate === undefined) {
            throw new Error(
                `Error - No schema found for ${schemaName}. Please check the JSON schemas exists in assets and there is an import in Ajv validator`,
            )
        }

        const valid = validate(args.data)
        if (!valid) {
            const errorMessage = `Error - ${args.filePath} do not match the schema ${schemaName}.json`
            console.log(errorMessage)
            console.log(validate.errors)
            throw new Error(errorMessage)
        }
    }

    /**
     * Get Id of resources created
     * @returns a dict of resource kind with the array of resource id
     */
    public getResourcesCreated(): pulumi.Output<string>[] {
        return this.resourcesCreated.map((resource) => resource.id)
    }

    /**
     * Get Id of resources created sorted by kind
     * @returns a dict of resource kind with the array of resource id
     */
    public getResourcesCreatedByKind(): ResourcesCreatedOutput {
        const result: ResourcesCreatedOutput = {}

        this.filesInput.map((fileInput, index) => {
            if (!(fileInput.kind in result)) result[fileInput.kind] = []

            result[fileInput.kind].push(this.resourcesCreated[index].id)
        })

        return result
    }

    /**
     * Retrieve files input
     * @returns array of data,filePath and kind
     */
    public getFilesInput(): Files[] {
        return this.filesInput
    }
}
