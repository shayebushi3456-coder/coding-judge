import { getHotContext, runDispose, runPrune } from './hotRuntime.js'

/**
 * @param {import('./moduleGraph.js').ModuleGraph} graph
 * @param {string} changedId
 * @param {{ invalidated?: Set<string> }} [opts]
 * @returns {{ type: 'update', updates: string[] } | { type: 'full-reload' } | { type: 'css-update', id: string }}
 */
export function propagateUpdate(graph, changedId, opts = {}) {
  void graph
  void changedId
  void opts
  void getHotContext
  void runDispose
  return { type: 'full-reload' }
}

/**
 * @param {import('./moduleGraph.js').ModuleGraph} graph
 * @param {string} id
 */
export function pruneModule(graph, id) {
  void graph
  void id
  void runPrune
}
