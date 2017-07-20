// @flow

import 'mocha'
import fs from 'fs'
import tmp from 'tmp'
import assert from 'assert'
// HACK: Flow don't know `util.promisify`
const {promisify} = (require('util'): any)

import FilePersistentStore from './file-persistent-store'

describe('FilePersistentStore', () => {
    it('works', async () => {
        const tmpname = tmp.tmpNameSync()

        const ps = new FilePersistentStore(tmpname)
        assert(await ps.load() === undefined)
        await ps.save('hey')
        assert(await ps.load() === 'hey')
        await ps.save(undefined)
        assert(await ps.load() === undefined)
        await ps.save('a')
        assert(await ps.load() === 'a')

        await promisify(fs.unlink)(tmpname)
    })
})
