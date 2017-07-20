// @flow

type CallbackFunc = (...any) => void

export const promisify = (func: CallbackFunc) => (...args: any) =>
    new Promise((resolve, reject) => {
        func(...args, (error, result) => {
            if (error) {
                reject(error)
                return
            }
            resolve(result)
        })
    })

export async function ignoreENOENT<T>(func: any => Promise<T>): Promise<?T> {
    try {
        return await func()
    } catch (error) {
        if (error.code === 'ENOENT') {
            return
        }
        throw error
    }
}
