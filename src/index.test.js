// @flow

import assert from 'assert'
import type {PersistentStore} from '.'
import {Migrator} from '.'

class VolatileStore implements PersistentStore {
    data: ?string = undefined

    async load() {
        return this.data
    }

    async save(data) {
        this.data = data
    }
}

const throwsAsync = async (func, regex) => {
    try {
        await func()
    } catch (error) {
        if (error.message.match(regex)) {
            return
        }
        throw error
    }
    throw new Error('Expected ' + regex.toString())
}

type Collection = Object[]
type DB = {[string]: Collection}

const db: DB = {}


const migrations = [
    {
        name: 'create-user-collection',

        async up() {
            db.Users = [
                {name: 'Racheal Isaman'},
                {name: 'Candida Poli'},
                {name: 'Hiroko Quach'},
                {name: 'Dixie Horne'},
            ]
        },
    },

    {
        name: 'split-user-firstName-and-lastName',

        async up() {
            db.Users = db.Users.map(({name}) => {
                const [firstName, lastName] = name.split(' ')
                return {firstName, lastName}
            })
        },

        async down() {
            db.Users = db.Users.map(({firstName, lastName}) => {
                return {
                    name: firstName + ' ' + lastName
                }
            })
        },
    },
]

describe('Migrator', () => {
    const store = new VolatileStore()
    const m = new Migrator(store, migrations)

    const getMigrationNames = async (...args) => {
        const {migrations, finalState} = await m._getMigrations(...args)

        return {
            migrations: migrations.map(m => m.name),
            finalState: finalState ? finalState.name : undefined,
        }
    }

    beforeEach(() => {
        store.data = undefined
    })

    describe('_getMigrations()', () => {

        it('works with `up` direction', async () => {
            assert.deepEqual(
                await getMigrationNames('up'),
                {
                    migrations: [
                        'create-user-collection',
                        'split-user-firstName-and-lastName',
                    ],
                    finalState: undefined,
                },
            )

            assert.deepEqual(
                await getMigrationNames('up', 'split-user-firstName-and-lastName'),
                {
                    migrations: [
                        'create-user-collection',
                        'split-user-firstName-and-lastName',
                    ],
                    finalState: undefined,
                },
            )

            assert.deepEqual(
                await getMigrationNames('up', 'create-user-collection'),
                {
                    migrations: [
                        'create-user-collection',
                    ],
                    finalState: 'split-user-firstName-and-lastName',
                },
            )

            store.data = 'create-user-collection'

            assert.deepEqual(
                await getMigrationNames('up'),
                {
                    migrations: [
                        'split-user-firstName-and-lastName',
                    ],
                    finalState: undefined,
                },
            )

            store.data = 'split-user-firstName-and-lastName'

            assert.deepEqual(
                await getMigrationNames('up'),
                {
                    migrations: [],
                    finalState: undefined,
                },
            )
        })


        it('works with `down` direction', async () => {
            assert.deepEqual(
                await getMigrationNames('down'),
                {
                    migrations: [],
                    finalState: undefined,
                },
            )

            store.data = 'split-user-firstName-and-lastName'

            assert.deepEqual(
                await getMigrationNames('down'),
                {
                    migrations: [
                        'split-user-firstName-and-lastName',
                        'create-user-collection',
                    ],
                    finalState: undefined,
                },
            )

            assert.deepEqual(
                await getMigrationNames('down', 'split-user-firstName-and-lastName'),
                {
                    migrations: [
                        'split-user-firstName-and-lastName',
                    ],
                    finalState: 'create-user-collection',
                },
            )
        })


        it('throws when a given migration name is unknown', async () => {
            const m = new Migrator(store, migrations)
            await throwsAsync(
                async () => await getMigrationNames('up', 'invalid-name'),
                /invalid-name is not a migration/,
            )
        })

        it('throws when the stored state is invalid', async () => {
            store.data = 'invalid-name-2'
            await throwsAsync(
                async () => await getMigrationNames('up'),
                /invalid-name-2 is not a migration/,
            )
        })
    })


    describe('up() and down()', () => {
        it('works', async () => {
            const m = new Migrator(store, migrations)
            const beginEvents = []
            const endEvents = []

            m.on('migrationBegin', event => {
                assert(beginEvents.length === endEvents.length)
                beginEvents.push(event)
            })
            m.on('migrationEnd', event => {
                assert(beginEvents.length === endEvents.length + 1)
                const beginEvent = beginEvents[beginEvents.length - 1]
                assert.deepStrictEqual(beginEvent, event)
                endEvents.push(event)
            })

            await m.up()

            assert.deepStrictEqual(
                db.Users,
                [
                    {firstName: 'Racheal', lastName: 'Isaman'},
                    {firstName: 'Candida', lastName: 'Poli'},
                    {firstName: 'Hiroko', lastName: 'Quach'},
                    {firstName: 'Dixie', lastName: 'Horne'},
                ],
            )
            assert(store.data === 'split-user-firstName-and-lastName')

            assert.deepStrictEqual(
                beginEvents,
                [
                    {
                        direction: 'up',
                        index: 0,
                        name: 'create-user-collection',
                    },
                    {
                        direction: 'up',
                        index: 1,
                        name: 'split-user-firstName-and-lastName',
                    },
                ],
            )

            await m.down('split-user-firstName-and-lastName')

            assert.deepStrictEqual(
                db.Users,
                [
                    {name: 'Racheal Isaman'},
                    {name: 'Candida Poli'},
                    {name: 'Hiroko Quach'},
                    {name: 'Dixie Horne'},
                ],
            )
            assert(store.data === 'create-user-collection')

            assert.deepStrictEqual(beginEvents, endEvents)
        })

        it('throws when a given migration name is unknown', async () => {
            const m = new Migrator(store, migrations)
            await throwsAsync(
                async () => await m.up('invalid-name'),
                /invalid-name is not a migration/,
            )
        })

        it('throws when the stored state is invalid', async () => {
            store.data = 'invalid-name-2'
            await throwsAsync(
                async () => await m.up(),
                /invalid-name-2 is not a migration/,
            )
        })

        it('throws when a migration is undoable', async () => {
            store.data = 'create-user-collection'
            await throwsAsync(
                async () => await m.down(),
                /create-user-collection cannot be undone/,
            )
        })
    })
})

import './file-persistent-store.test'
