import { resolve } from 'path'
import { ResourceFileReader } from '../lib'

const myReader = new ResourceFileReader({
    assetsRelativeFolder: resolve(__dirname, `../conf/test`),
})
myReader.run()

export const otoroshiResources = myReader.getResourcesCreatedByKind()
