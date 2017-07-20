
export const promisify = func => (...args) =>
    new Promise((resolve, reject) => {
        func(...args, (error, result) => {
            if (error) {
                reject(error)
                return
            }
            resolve(result)
        })
    })
