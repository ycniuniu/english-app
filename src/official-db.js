const DB_NAME = 'kaikou.official.v1'
const DB_VERSION = 1

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('storage'))
  })
}

export function openOfficialDb(factory = globalThis.indexedDB) {
  if (!factory) return Promise.reject(objectError('blocked'))
  return new Promise((resolve, reject) => {
    let request
    try {
      request = factory.open(DB_NAME, DB_VERSION)
    } catch (error) {
      reject(objectError('blocked', error))
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath: 'packId' })
    }
    request.onsuccess = () => resolve(wrapDb(request.result))
    request.onerror = () => reject(objectError('blocked', request.error))
  })
}

function objectError(reason, cause) {
  const error = new Error(reason === 'quota' ? '存储空间不够。' : '这台浏览器没有允许保存本地资料。')
  error.reason = reason
  error.cause = cause || null
  return error
}

function reasonOf(error) {
  const name = error && error.name ? error.name : ''
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') return 'quota'
  return 'blocked'
}

function wrapDb(db) {
  return {
    async listPacks() {
      const rows = await readAll(db, 'packs')
      return rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    },
    async getPack(id) {
      return getOne(db, 'packs', id)
    },
    async findByHash(hash) {
      const rows = await readAll(db, 'packs')
      return rows.find((row) => row.hash === hash) || null
    },
    async writePack({ pack, assets }) {
      await transact(db, ['packs', 'assets'], (stores) => {
        stores.packs.put(pack)
        for (const asset of assets) stores.assets.put(asset)
      })
    },
    async assetsFor(packId) {
      const rows = await readAll(db, 'assets')
      return rows.filter((row) => row.packId === packId)
    },
    async getProgress(packId) {
      return (await getOne(db, 'progress', packId)) || { packId, answers: {}, wrong: {}, resume: null, history: [] }
    },
    async putProgress(progress) {
      await transact(db, ['progress'], (stores) => {
        stores.progress.put(progress)
      })
    },
    async deletePack(packId) {
      const assets = await this.assetsFor(packId)
      await transact(db, ['packs', 'assets', 'progress'], (stores) => {
        stores.packs.delete(packId)
        stores.progress.delete(packId)
        for (const asset of assets) stores.assets.delete(asset.id)
      })
    },
    close() {
      db.close()
    },
  }
}

function readAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const request = tx.objectStore(store).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(objectError(reasonOf(request.error), request.error))
  })
}

function getOne(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const request = tx.objectStore(store).get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(objectError(reasonOf(request.error), request.error))
  })
}

function transact(db, names, fill) {
  return new Promise((resolve, reject) => {
    let tx
    try {
      tx = db.transaction(names, 'readwrite')
    } catch (error) {
      reject(objectError(reasonOf(error), error))
      return
    }
    const stores = Object.fromEntries(names.map((name) => [name, tx.objectStore(name)]))
    try {
      fill(stores)
    } catch (error) {
      reject(objectError(reasonOf(error), error))
      return
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(objectError(reasonOf(tx.error), tx.error))
    tx.onabort = () => reject(objectError(reasonOf(tx.error), tx.error))
  })
}

export function createMemoryOfficialDb(initial = {}) {
  const state = {
    packs: new Map((initial.packs || []).map((row) => [row.id, structuredClone(row)])),
    assets: new Map((initial.assets || []).map((row) => [row.id, row])),
    progress: new Map((initial.progress || []).map((row) => [row.packId, structuredClone(row)])),
  }
  let fail = null
  return {
    state,
    failNext(reason) {
      fail = reason
    },
    async listPacks() {
      return [...state.packs.values()]
    },
    async getPack(id) {
      return state.packs.get(id) || null
    },
    async findByHash(hash) {
      return [...state.packs.values()].find((row) => row.hash === hash) || null
    },
    async writePack({ pack, assets }) {
      if (fail) {
        const reason = fail
        fail = null
        throw objectError(reason)
      }
      state.packs.set(pack.id, structuredClone(pack))
      for (const asset of assets) state.assets.set(asset.id, asset)
    },
    async assetsFor(packId) {
      return [...state.assets.values()].filter((row) => row.packId === packId)
    },
    async getProgress(packId) {
      return state.progress.get(packId) || { packId, answers: {}, wrong: {}, resume: null, history: [] }
    },
    async putProgress(progress) {
      if (fail) {
        const reason = fail
        fail = null
        throw objectError(reason)
      }
      state.progress.set(progress.packId, structuredClone(progress))
    },
    async deletePack(packId) {
      state.packs.delete(packId)
      state.progress.delete(packId)
      for (const [id, asset] of state.assets) {
        if (asset.packId === packId) state.assets.delete(id)
      }
    },
    close() {},
  }
}

export function storageMessage(error) {
  if (error?.reason === 'quota') return '本地资料太大，浏览器装不下。已经在库里的单词记录和这一份之前的资料都没有删。'
  return '浏览器没有允许把资料放进本地数据库（隐私模式常会这样）。单词记录没有改。'
}

export { requestToPromise }
