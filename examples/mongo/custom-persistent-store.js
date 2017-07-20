
const getPersistentStore = db => ({
    async load() {
        const doc = await db.collection('migrations')
                            .findOne({})
        if (doc) {
            return doc.data
        }
    },

    async save(data) {
        assert(typeof data === 'string')

        await db.collection('migrations').updateOne(
            {},
            {data},
            {upsert: true},
        )
    },
})
