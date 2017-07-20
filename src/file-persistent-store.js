// @flow

import fs from 'fs'

import {promisify, ignoreENOENT} from './util'
import type {Path, PersistentStore} from '.'

export default class FilePersistentStore implements PersistentStore {
    _path: Path

    constructor(path: Path) {
        this._path = path
    }

    load() {
        return ignoreENOENT(async () => {
            const buffer = await promisify(fs.readFile)(
                this._path,
            )
            return buffer.toString()
        })
    }

    async save(data: ?string) {
        if (!data) {
            await ignoreENOENT(
                () => promisify(fs.unlink)(this._path)
            )
            return
        }

        await promisify(fs.writeFile)(
            this._path,
            data,
        )
    }
}
