import {
  memoizePromiseFactory,
  newQuickJSWASMModuleFromVariant,
  newVariant,
} from 'quickjs-emscripten-core'
import releaseSync from '@jitl/quickjs-wasmfile-release-sync'
// Vite resolves ?url to the emitted .wasm asset URL (honors the /mdast-jsx/ base);
// the variant fetches the separate .wasm from there. This mirrors the library's
// official Vite example (examples/vite-vue/src/quickjs.ts).
import wasmLocation from '@jitl/quickjs-wasmfile-release-sync/wasm?url'

const variant = newVariant(releaseSync, { wasmLocation })

/**
 * Instantiate the sandbox VM module, once (memoized with the library's own
 * `memoizePromiseFactory`). Call this at runtime - e.g. from a React effect, as
 * the library's React example does with `getQuickJS()` - not at module top
 * level: the variant's wasm loader is a dynamic import Vite inlines into the
 * main chunk, so a top-level `await` would touch it mid-initialization and throw
 * a TDZ error in the production bundle.
 */
export const loadQuickJS = memoizePromiseFactory(() =>
  newQuickJSWASMModuleFromVariant(variant),
)
