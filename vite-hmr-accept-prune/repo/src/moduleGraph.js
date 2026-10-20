/** @typedef {{ id: string, importers: Set<string>, imported: Set<string>, isSelfAccepting: boolean, acceptedHmrDeps: Set<string>, isCss?: boolean }} ModuleNode */

export class ModuleGraph {
  /** @type {Map<string, ModuleNode>} */
  idToModuleMap = new Map()

  ensure(id, { isCss = false } = {}) {
    let m = this.idToModuleMap.get(id)
    if (!m) {
      m = {
        id,
        importers: new Set(),
        imported: new Set(),
        isSelfAccepting: false,
        acceptedHmrDeps: new Set(),
        isCss: !!isCss,
      }
      this.idToModuleMap.set(id, m)
    }
    return m
  }

  link(importerId, importedId) {
    const a = this.ensure(importerId)
    const b = this.ensure(importedId)
    a.imported.add(importedId)
    b.importers.add(importerId)
  }

  get(id) {
    return this.idToModuleMap.get(id)
  }
}
