import Ajv from 'ajv'
import * as apikey from '../../assets/schemas/apikey_spec.json'
import * as globalconfig from '../../assets/schemas/globalconfig_spec.json'
import * as resource from '../../assets/schemas/resource_spec.json'

/**
 * See Official documentation https://ajv.js.org/json-schema.html
 */

interface ValidatorSchemasCustom {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

/**
 * Load JSON Ajv schemas
 */
const validatorSchemasCustom: ValidatorSchemasCustom = {
    apikey,
    globalconfig,
}

export const validator = new Ajv()
export const schemascustom = Object.keys(validatorSchemasCustom)

Object.keys(validatorSchemasCustom).forEach((key) => {
    validator.addSchema(validatorSchemasCustom[key], key)
})

validator.addSchema(resource, 'resource')
