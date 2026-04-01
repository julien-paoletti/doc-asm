import type { SectionPlugin } from '../types.js';

const registry = new Map<string, SectionPlugin>();
const listeners = new Set<() => void>();

export function registerPlugin(plugin: SectionPlugin): void {
  registry.set(plugin.typeId, plugin);
  listeners.forEach((fn) => fn());
}

export function onRegistryChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPlugin(typeId: string): SectionPlugin {
  const plugin = registry.get(typeId);
  if (!plugin) throw new Error(`Section plugin not found: ${typeId}`);
  return plugin;
}

export function getAllPlugins(): SectionPlugin[] {
  return Array.from(registry.values());
}
