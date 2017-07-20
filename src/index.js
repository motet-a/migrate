// @flow

const assert = require('assert')
const EventEmitter = require('events')

import FilePersistentStore from './file-persistent-store'

// TODO: Use `opaque type Path = string` once opaque type declarations
// will be supported by Babylon.
export type Path = string

export type Direction = 'up' | 'down'

export type Migration = {
    name: string,
    up: () => Promise<void>,
    down?: () => Promise<void>,
}

export interface PersistentStore {
    // Must resolve `undefined` the first time.
    load(): Promise<?string>,
    save(?string): Promise<void>,
}

type GetMigrationsResult = {
    migrations: Migration[],
    finalState: ?Migration,
}

export class Migrator extends EventEmitter {
    _migrations: Migration[]
    _store: PersistentStore

    constructor(
        store: PersistentStore | Path,
        migrations: Migration[] = [],
    ) {
        super()
        this._migrations = migrations
        this._store = typeof store === 'string' ?
                      new FilePersistentStore(store) : store
    }

    getMigrationIndex(name: string): number {
        const i = this._migrations
                      .findIndex(m => m.name === name)
        assert(i !== -1, name + ' is not a migration')
        return i
    }

    // Resolves -1 if no migration has been applied, 0 if the first
    // one has been applied and so on.
    async _getCurrentIndex(): Promise<number> {
        const name = await this._store.load()
        if (!name) {
            return -1
        }
        return this.getMigrationIndex(name)
    }

    // Do migrations until lastMigrationName (included).
    async up(lastMigrationName: ?string) {
        await this._migrate('up', lastMigrationName)
    }

    // Undo migrations until lastMigrationName (included).
    async down(lastMigrationName: ?string) {
        await this._migrate('down', lastMigrationName)
    }

    async _getMigrationsUp(lastMigrationName: ?string) {
        const lastIndex =
            lastMigrationName ? this.getMigrationIndex(lastMigrationName) :
            this._migrations.length - 1

        const migrations = []
        let index = await this._getCurrentIndex() + 1
        while (index < lastIndex + 1) {
            migrations.push(this._migrations[index])
            index++
        }
        const finalState: ?Migration = this._migrations[index]
        return {migrations, finalState}
    }

    async _getMigrationsDown(lastMigrationName: ?string) {
        const lastIndex =
            lastMigrationName ? this.getMigrationIndex(lastMigrationName) :
            0

        const migrations = []
        let index = await this._getCurrentIndex()
        while (index >= lastIndex) {
            migrations.push(this._migrations[index])
            index--
        }
        const finalState: ?Migration = this._migrations[index]
        return {migrations, finalState}
    }

    _getMigrations(
        direction: Direction,
        lastMigrationName: ?string,
    ): Promise<GetMigrationsResult> {
        return direction === 'up' ?
               this._getMigrationsUp(lastMigrationName) :
               this._getMigrationsDown(lastMigrationName)
    }

    async _migrate(direction: Direction, lastMigrationName: ?string) {
        const {migrations, finalState} = await this._getMigrations(
            direction, lastMigrationName,
        )

        if (direction === 'down') {
            const undoable = migrations.find(m => !m.down)
            if (undoable) {
                throw new Error('Migration ' + undoable.name +
                                ' cannot be undone')
            }
        }

        for (let i = 0; i < migrations.length; i++) {
            const migration = migrations[i]
            const nextMigration = migrations[i + 1] || finalState

            const event = {
                direction,
                index: i,
                name: migration.name,
            }

            this.emit('migrationBegin', event)

            const migrationFunc = migration[direction]
            if (migrationFunc === null ||
                migrationFunc === undefined) {
                throw new Error()
            }
            await migrationFunc()
            await this._store.save(
                direction === 'up' ? migration.name :
                nextMigration ? nextMigration.name : undefined
            )

            this.emit('migrationEnd', event)
        }
    }
}

export {FilePersistentStore}

export const migrate = (
    store: PersistentStore | Path,
    migrations: Migration[] = [],
) =>
    new Migrator(store, migrations)

export default migrate
