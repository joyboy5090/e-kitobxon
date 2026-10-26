import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'

export class LocalStorageClient {
  constructor(dir = path.join(process.cwd(), 'storage')) {
    this.dir = path.resolve(dir)
  }

  _path(name) {
    const full = path.resolve(this.dir, name)
    if (!full.startsWith(this.dir + path.sep)) throw new Error('Invalid path')
    return full
  }

  // Faylning diskdagi to'liq manzili (PDF'ni brauzerga berish uchun)
  resolvePath(name) {
    return this._path(name)
  }

  async _wrap(fn) {
    try {
      return { ok: true, value: await fn(), error: null }
    } catch (error) {
      return { ok: false, value: null, error: { message: error.message } }
    }
  }

  uploadFromBytes(name, bytes) {
    return this._wrap(async () => {
      const full = this._path(name)
      await fs.mkdir(path.dirname(full), { recursive: true })
      await fs.writeFile(full, bytes)
    })
  }

  uploadFromText(name, text) {
    return this.uploadFromBytes(name, Buffer.from(text, 'utf8'))
  }

  downloadAsBytes(name) {
    return this._wrap(async () => [await fs.readFile(this._path(name))])
  }

  downloadAsText(name) {
    return this._wrap(() => fs.readFile(this._path(name), 'utf8'))
  }

  downloadAsStream(name) {
    return createReadStream(this._path(name))
  }

  exists(name) {
    return this._wrap(() =>
      fs.access(this._path(name)).then(() => true, () => false)
    )
  }

  delete(name) {
    return this._wrap(() => fs.rm(this._path(name), { force: true }))
  }

  list() {
    return this._wrap(async () => {
      await fs.mkdir(this.dir, { recursive: true })
      const names = await fs.readdir(this.dir, { recursive: true })
      return names.map((name) => ({ name: name.replaceAll('\\', '/') }))
    })
  }
}
