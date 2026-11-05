// Tests registration and lifecycle against the installed desktop's actual code.
// Does not launch the app, change its profile, or access conversation data.
import assert from 'node:assert/strict';
import {openSync, readSync, closeSync, readFileSync} from 'node:fs';
import vm from 'node:vm';

const archive = process.env.DSH_APP_ASAR ?? '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar';
const fd = openSync(archive, 'r');
const prefix = Buffer.alloc(16);
readSync(fd, prefix, 0, prefix.length, 0);
const headerBytes = Buffer.alloc(prefix.readUInt32LE(12));
readSync(fd, headerBytes, 0, headerBytes.length, 16);
const header = JSON.parse(headerBytes.toString());
const base = 8 + prefix.readUInt32LE(4);
function readArchive(path) {
  let entry = header;
  for (const part of path.split('/')) entry = entry?.files?.[part];
  assert.ok(entry && !entry.unpacked, `Missing packed runtime file: ${path}`);
  const bytes = Buffer.alloc(entry.size);
  readSync(fd, bytes, 0, bytes.length, base + Number(entry.offset));
  return bytes.toString();
}
function findAsset(entry, path = '') {
  for (const [key, value] of Object.entries(entry.files ?? {})) {
    const name = path ? `${path}/${key}` : key;
    if (value.files) { const found = findAsset(value, name); if (found) return found; }
    else if (/dsh-web-frontend\/dist\/assets\/index-.*\.js$/.test(name)) return name;
  }
}
const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const cosmokitURL = dataModule(readArchive('dsh/node_modules/@deepseek-ai/cosmokit/lib/index.js'));
const cordis = await import(dataModule(readArchive('dsh/node_modules/@deepseek-ai/cordis/lib/index.js')
  .replace('"@deepseek-ai/cosmokit"', JSON.stringify(cosmokitURL))));
const shell = readArchive(findAsset(header));
// The installed shell embeds SlotCore. Fail explicitly if its build format changes.
const start = shell.indexOf('const i1=Object.freeze([]);var SI=class');
const end = shell.indexOf(';const jI=', start);
assert.ok(start >= 0 && end > start, 'Installed SlotCore extraction needs updating for this host version');
const core = {queueMicrotask};
vm.runInNewContext(`${shell.slice(start, end)};globalThis.SlotCore=SI;`, core);
const slotModule = {
  SlotCore: core.SlotCore,
  SlotOwnershipError: class extends Error {},
  StaleAuthorizationError: class extends Error {},
  standardHookPropName: key => `use${key[0].toUpperCase()}${key.slice(1)}`,
  resolveSlotLabel: label => typeof label === 'function' ? label() : label,
};
// React is intentionally a registration-only seam; no GUI/layout claims here.
const React = {createContext: () => ({}), Component: class {}, createElement() {}};
const dictionaries = {};
const locale = {
  register(ns, lang, dict) { dictionaries[ns] = typeof lang === 'string' ? dict : lang; return () => {}; },
  bind: () => key => key, subscribe: () => () => {}, getSnapshot: () => 'en',
};
const storage = new Map();
const windowListeners = new Set();
const window = {addEventListener: (_, fn) => windowListeners.add(fn), removeEventListener: (_, fn) => windowListeners.delete(fn)};
const require = name => {
  if (name === '@deepseek-ai/cordis') return cordis;
  if (name === '@deepseek-ai/dsh-client-ui-slots') return slotModule;
  if (name === '@deepseek-ai/dsh-client-store') return {createSnapshotStore(initial) {
    let snapshot = initial;
    return {getSnapshot: () => snapshot, set: next => {snapshot = next;}, subscribe: () => () => {}};
  }};
  return name === 'react' ? React : {};
};
function load(source) {
  let module;
  window.__ModuleLoader__ = {load: value => {module = value;}};
  vm.runInNewContext(source, {window, console, queueMicrotask, localStorage: {
    getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value),
  }});
  return module.factory(require);
}
const renderer = load(readArchive('dsh/node_modules/@deepseek-ai/dsh-client-ui-renderer/lib/client.js'));
const native = load(readArchive('dsh/node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js'));
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8');
const yamlContext = {exports: {}};
yamlContext.module = {exports: yamlContext.exports};
vm.runInNewContext(readArchive('node_modules/js-yaml/dist/js-yaml.js'), yamlContext);
const include = readArchive('dsh/node_modules/@deepseek-ai/cordis-plugin-include/lib/index.js');
const patchStart = include.indexOf('function applyEntryPatches(');
const patchEnd = include.indexOf('\n}', patchStart) + 2;
assert.ok(patchStart >= 0 && patchEnd > patchStart, 'Cannot extract installed patch composition');
const patchContext = {structuredClone};
vm.runInNewContext(`${include.slice(patchStart, patchEnd)};globalThis.compose=applyEntryPatches`, patchContext);
const nativeRow = {id: 'ui-sidebar', name: '@deepseek-ai/dsh-client-ui-sidebar'};
const warnings = [];
const composed = patchContext.compose([nativeRow], yamlContext.exports.load(patch), (...args) => warnings.push(args));
assert.equal(warnings.length, 0);
const active = composed.filter(row => !row.disabled);
assert.equal(active.length, 1, 'Exactly one sidebar owner must remain enabled');
assert.equal(active[0].name, '@local/sidebar-groups');
assert.equal(composed.find(row => row.id === 'ui-sidebar').disabled, true);
assert.equal(nativeRow.disabled, undefined, 'Composition must leave original host config intact');
const enablePatch = yamlContext.exports.load(readFileSync(new URL('../profile-enable.patch.yml', import.meta.url), 'utf8'));
const recoveryPatch = yamlContext.exports.load(readFileSync(new URL('../profile-recovery.patch.yml', import.meta.url), 'utf8'));
const enabled = patchContext.compose(composed, enablePatch, (...args) => warnings.push(args));
assert.equal(enabled.filter(row => !row.disabled).length, 1);
assert.equal(enabled.find(row => !row.disabled).name, '@local/sidebar-groups');
const recovered = patchContext.compose(enabled, recoveryPatch, (...args) => warnings.push(args));
assert.equal(recovered.filter(row => !row.disabled).length, 1);
assert.equal(recovered.find(row => !row.disabled).name, nativeRow.name);
assert.equal(warnings.length, 0);
console.log('PASS: installed patch composer disables native row and enables exactly one replacement');
console.log('PASS: enable and recovery overlays each keep exactly one active sidebar');

async function setup() {
  const ctx = new cordis.Context();
  ctx.reflect.provide('locale', locale);
  ctx.reflect.provide('layout', {});
  ctx.reflect.provide('uiWorkspace', {});
  ctx.reflect.provide('shortcuts', {catalog: {}});
  await ctx.plugin(renderer);
  ctx.slots.register({name: 'root', children: {
    sidebar: {kind: 'single', scope: 'root'},
    'shell.leading': {kind: 'single', scope: 'root'},
  }}, () => null);
  return ctx;
}

// Reproduce the old insertion design with the original host apply function.
const broken = await setup();
await broken.plugin(native);
const originalRegistration = source.replace("name:'sidebar',children", "name:'sidebar',priority:100,children");
assert.throws(() => load(originalRegistration).apply(broken), /slot "sidebar.brand.mark" is already declared/);
await broken.fiber.dispose();
assert.equal(windowListeners.size, 0, 'Failed setup must clean up listeners');
console.log('PASS: original composition reproduces duplicate sidebar.brand.mark declaration');

// Compose the repaired row: replacement, one declaring owner, native children remain usable.
const fixed = await setup();
const plugin = fixed.plugin(load(source));
await plugin;
assert.equal(plugin.state, 2, 'Replacement plugin must activate in real Cordis');
assert.equal(fixed.slots.entries('sidebar').length, 1);
assert.equal(fixed.slots.entries('shell.leading').length, 1);
const childNames = Object.keys(fixed.slots.entries('sidebar')[0].children);
assert.equal(childNames.length, 8);
const contributions = childNames.map(name => fixed.slots.register({name,
  ...(name.includes('panellist') || name === 'sidebar.footer.action' ? {id: `test-${name}`} : {}),
}, () => null));
for (const name of childNames) assert.equal(fixed.slots.entriesOfSlot(name).length, 1);
contributions.reverse().forEach(dispose => dispose());
await plugin.dispose();
assert.equal(fixed.slots.entries('sidebar').length, 0);
assert.equal(fixed.slots.entries('shell.leading').length, 0);
assert.equal(windowListeners.size, 0);
await fixed.plugin(native);
assert.equal(fixed.slots.entries('sidebar').length, 1, 'Native sidebar must register after removing replacement');
await fixed.fiber.dispose();
closeSync(fd);
console.log('PASS: replacement activates, all 8 extension slots accept entries, header controls register, unload and native restoration succeed');
