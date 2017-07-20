
const path = require('path')
const {MongoClient} = require('mongodb')
const {migrate, FilePersistentStore} = require('../..')

const getMigrations = require('./migrations')

const getDb = async () => {
    const db = await MongoClient.connect(
        'mongodb://localhost:27017/migrate-test'
    )

    // Drop existing collections
    await db.collection('users').deleteMany({})

    return db
}

const getStore = async () => {
    const store = new FilePersistentStore(
        path.join(__dirname, '.migration')
    )
    // Drop existing `.migration` file
    await store.save(undefined)

    return store
}

const main = async () => {
    const db = await getDb()
    const store = await getStore()
    const migrations = getMigrations(db)
    const migrator = migrate(store, migrations)
    migrator.on('migrationEnd', ({direction, name}) => {
        console.log(direction, name)
    })
    await migrator.up()

    const getUsers = () =>
        db.collection('users')
          .find()
          .toArray()

    console.log('\nUsers:')
    console.log(await getUsers())

    await migrator.down('4-add-full-user-name')
    console.log('\nWithout full name:')
    console.log(await getUsers())

    await db.close()
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
