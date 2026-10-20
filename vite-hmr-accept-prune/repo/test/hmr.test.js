import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  ModuleGraph,
  createHotContext,
  resetHotRegistry,
  propagateUpdate,
  pruneModule,
  getHotContext,
} from '../src/index.js'

describe('module graph basics', () => {
  it('links importer edges', () => {
    const g = new ModuleGraph()
    g.link('a.js', 'b.js')
    assert.equal(g.get('a.js').imported.has('b.js'), true)
    assert.equal(g.get('b.js').importers.has('a.js'), true)
  })
})

describe('hmr propagate', () => {
  beforeEach(() => {
    resetHotRegistry()
  })

  it('self-accepting module updates without full reload', () => {
    const g = new ModuleGraph()
    g.ensure('leaf.js')
    const hot = createHotContext('leaf.js')
    hot.accept()
    const r = propagateUpdate(g, 'leaf.js')
    assert.equal(r.type, 'update')
    assert.deepEqual(r.updates, ['leaf.js'])
  })

  it('bubbles to importer accept boundary', () => {
    const g = new ModuleGraph()
    g.link('page.js', 'btn.js')
    createHotContext('page.js').accept('./btn.js', () => {})
    // graph-level accepted deps also mirrored for server propagation
    g.get('page.js').acceptedHmrDeps.add('btn.js')
    const r = propagateUpdate(g, 'btn.js')
    assert.equal(r.type, 'update')
    assert.ok(r.updates.includes('page.js') || r.updates.includes('btn.js'))
  })

  it('full-reload when no accept boundary', () => {
    const g = new ModuleGraph()
    g.link('app.js', 'util.js')
    createHotContext('app.js')
    createHotContext('util.js')
    const r = propagateUpdate(g, 'util.js')
    assert.equal(r.type, 'full-reload')
  })

  it('runs dispose before update and keeps hot.data', () => {
    const g = new ModuleGraph()
    g.ensure('leaf.js')
    const hot = createHotContext('leaf.js')
    hot.accept()
    let disposed = false
    hot.dispose((data) => {
      disposed = true
      data.n = (data.n || 0) + 1
    })
    hot.data.n = 1
    const r = propagateUpdate(g, 'leaf.js')
    assert.equal(r.type, 'update')
    assert.equal(disposed, true)
    assert.equal(getHotContext('leaf.js').data.n, 2)
  })

  it('css modules prefer css-update', () => {
    const g = new ModuleGraph()
    g.ensure('x.css', { isCss: true })
    createHotContext('x.css').accept()
    const r = propagateUpdate(g, 'x.css')
    assert.equal(r.type, 'css-update')
    assert.equal(r.id, 'x.css')
  })

  it('invalidate forces boundary re-eval path', () => {
    const g = new ModuleGraph()
    g.link('page.js', 'btn.js')
    g.get('page.js').acceptedHmrDeps.add('btn.js')
    createHotContext('page.js').accept('./btn.js', () => {})
    const leaf = createHotContext('btn.js')
    leaf.invalidate()
    const r = propagateUpdate(g, 'btn.js')
    assert.equal(r.type, 'update')
  })

  it('prune removes node and runs prune callback', () => {
    const g = new ModuleGraph()
    g.link('a.js', 'b.js')
    let pruned = false
    createHotContext('b.js').prune(() => {
      pruned = true
    })
    pruneModule(g, 'b.js')
    assert.equal(pruned, true)
    assert.equal(g.get('b.js'), undefined)
    assert.equal(g.get('a.js').imported.has('b.js'), false)
  })
})
