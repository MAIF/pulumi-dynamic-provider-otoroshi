import * as fs from 'fs'
import * as path from 'path'

/**
 * Read a directory and his subdirectories recursively and return a list of files
 * @param directory Path to the directory
 * @param allowedFileExtentions allow only some files extensions (ex: ['.yaml', '.yml']). If none, take all files
 * @returns array of files fullPath
 */
export function readDirRecursiveSync(directory: string, allowedFileExtentions?: string[]): string[] {
    let files: string[] = []

    // Check that the file exists locally
    if (!fs.existsSync(directory)) {
        throw new Error(`Directory ${directory} does not exist. Please check the path`)
    }

    // Read folder content
    const items = fs.readdirSync(directory, {
        withFileTypes: true,
    })

    // Browse each item
    for (const item of items) {
        if (item.isDirectory()) {
            files = [...files, ...readDirRecursiveSync(`${directory}/${item.name}`, allowedFileExtentions)]
        } else {
            const shouldPush =
                allowedFileExtentions === undefined || allowedFileExtentions.includes(path.extname(item.name))
            if (shouldPush) files.push(`${directory}/${item.name}`)
        }
    }

    return files
}
