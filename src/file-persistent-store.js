// @flow

const fs = require('fs')
// HACK: Flow doesn't know `util.promisify`
const {promisify} = (require('util'): any)

import type {Path, PersistentStore} from '.'

export default class FilePersistentStore implements PersistentStore {
    _path: Path

    constructor(path: Path) {
        this._path = path
    }

    async load() {
        try {
            const buffer = await promisify(fs.readFile)(
                this._path,
            )
            return buffer.toString()
        } catch (error) {
            if (error.code === 'ENOENT') {
                return
            }
            throw error
        }
    }

    save(data: ?string) {
        if (!data) {
            return promisify(fs.unlink)(this._path)
        }

        return promisify(fs.writeFile)(
            this._path,
            data,
        )
    }
}
