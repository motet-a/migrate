
const capitalize = s =>
    s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase()

// Be careful if you use this with MMAPv1
const mapCollection = async (collection, mapFunction) => {
    const cursor = collection.find()

    while (true) {
        const doc = await cursor.next()
        if (!doc) {
            break
        }

        await collection.updateOne(
            {_id: doc._id},
            mapFunction(doc),
        )
    }
}


module.exports = db => [
    {
        name: '0-create-users',
        async up() {
            await db.createCollection('users')
        },
    },

    {
        name: '1-insert-users',
        async up() {
            await db.collection('users').insertMany([
                {firstName: 'Rayford', lastName: ' dowler'},
                {firstName: 'KISHA', lastName: 'MArroquin'},
                {firstName: 'dierdre ', lastName: 'friend  '},
            ])
        },
    },

    {
        name: '2-trim-user-names',
        async up() {
            await mapCollection(
                db.collection('users'),

                user => ({
                    $set: {
                        firstName: user.firstName.trim(),
                        lastName: user.lastName.trim(),
                    },
                }),
            )
        },
        async down() {
        },
    },

    {
        name: '3-capitalize-user-names',
        async up() {
            await mapCollection(
                db.collection('users'),

                user => ({
                    $set: {
                        firstName: capitalize(user.firstName),
                        lastName: capitalize(user.lastName),
                    },
                }),
            )
        },
        async down() {
        },
    },

    {
        name: '4-add-full-user-name',
        async up() {
            await mapCollection(
                db.collection('users'),

                user => ({
                    $set: {
                        fullName: user.firstName + ' ' + user.lastName,
                    },
                }),
            )
        },
        async down() {
            await mapCollection(
                db.collection('users'),

                user => ({
                    $unset: {fullName: ""},
                })
            )
        },
    },
]
