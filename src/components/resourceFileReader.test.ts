import { parse, resolve } from 'path'
import { ResourceFileReader } from './'

describe('resourceFileReader.ts', () => {
    const myReader = new ResourceFileReader({
        assetsRelativeFolder: resolve(__dirname, '../../conf/test/minimal'),
    })

    test('resourceFileReader should be instanciate', () => {
        expect(myReader).toBeDefined()
    })

    const files = myReader.getFilesInput()
    const filesExts = new Set(files.map((file) => parse(file.filePath).ext))

    test('resourceFileReader list should retrieve only allowed files type', () => {
        expect(files.length).toEqual(10)
        filesExts.forEach((ext) => expect(ResourceFileReader.ALLOWED_FILE_EXTENTIONS.includes(ext)).toBeTruthy())
    })

    /**
     * Test with an invalid PATH folder
     */
    const myReaderEmpty = new ResourceFileReader({
        assetsRelativeFolder: resolve(__dirname, '../../pathThatDoNotExist'),
    })

    test('resourceFileReaderEmpty should be instanciate', () => {
        expect(myReaderEmpty).toBeDefined()
    })

    test('resourceFileReaderEmpty should have an empty list of files to handle', () => {
        expect(myReaderEmpty.getFilesInput()).toHaveLength(0)
    })
})
