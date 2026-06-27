# Changelog

## [0.1.2](https://github.com/supabase-community/mdast-jsx/compare/v0.1.1...v0.1.2) (2026-06-27)


### Features

* add buildVmModules VM bundler ([5279d40](https://github.com/supabase-community/mdast-jsx/commit/5279d40292866019f301ff896e3fa90d0f44d53e))
* add GitHub Pages deploy workflow and playground CI steps ([62cc213](https://github.com/supabase-community/mdast-jsx/commit/62cc213267a49715eb1f9a9ca0921c47fc9746e3))
* add runTsx - compile TSX with Sucrase and execute in sandboxed quickjs VM ([a6c102d](https://github.com/supabase-community/mdast-jsx/commit/a6c102d9c5fd9e5c6303048e8fa30151c0412826))
* **playground:** add collectTypeDefs() for Monaco .d.ts payload ([af71bad](https://github.com/supabase-community/mdast-jsx/commit/af71badb20513730d44273d784c5a94aaf3b2a62))
* **playground:** add Monaco editor with mdast-jsx TypeScript wiring ([2c8aa51](https://github.com/supabase-community/mdast-jsx/commit/2c8aa51c581dd366796a8345238fe4db6dd6410d))
* **playground:** add starter presets (release notes, usage table, LLM context) ([c0dd2ae](https://github.com/supabase-community/mdast-jsx/commit/c0dd2aedeca7a66363b73984db9fd75dc5df5d22))
* **playground:** add virtual module plugins for vm-modules and type-defs ([93e08e1](https://github.com/supabase-community/mdast-jsx/commit/93e08e1199dc67a824d99929cf7b34198a804b79))
* **playground:** load examples from ./examples/*.tsx via Vite ?raw ([ae3a87f](https://github.com/supabase-community/mdast-jsx/commit/ae3a87f366378f95f11d5e0ac4b3fe1cc99a21d4))
* **playground:** shadcn UI, self-hosted Monaco, real lib types, markdown output highlighting ([d8e1897](https://github.com/supabase-community/mdast-jsx/commit/d8e1897a614bc63f1b39f37a9626bc29e936fb22))
* **playground:** VS Code-accurate highlighting via shiki + dark/light toggle ([4c7a9c4](https://github.com/supabase-community/mdast-jsx/commit/4c7a9c4c2262bb3f48fffbeb6dd1269070c69837))
* **playground:** wire App integration, OutputPane, debounced runTsx, quickjs init ([01844b4](https://github.com/supabase-community/mdast-jsx/commit/01844b4bf381fd4a4c4d463f20bb25b518f7b357))
* scaffold playground workspace and blank app ([d9ff11c](https://github.com/supabase-community/mdast-jsx/commit/d9ff11c2eb60b4ddfd898c6cc6327890b4232d74))


### Bug Fixes

* drop minimumReleaseAge exclusions added during scaffold ([37a815f](https://github.com/supabase-community/mdast-jsx/commit/37a815fa7d32fc3fd5d162a5d907daa55f2e9759))
* keep last-good markdown visible with error banner in OutputPane ([c16826f](https://github.com/supabase-community/mdast-jsx/commit/c16826f9e79fca28aa5d09993ea4aade06fd96e5))
* **playground:** load quickjs lazily in a React effect to fix blank prod build ([c5b344b](https://github.com/supabase-community/mdast-jsx/commit/c5b344bab8a9ba615466ac387492aec902cf1ec6))
* **playground:** self-host quickjs via wasmfile+core, esnext-only editor libs, unist-util-visit lang detection ([9adbfde](https://github.com/supabase-community/mdast-jsx/commit/9adbfde586f3eb830bc98c2e946e24c3b3cc4274))
* prefix runtime errors and scan re-exports in runTsx ([2cc5b27](https://github.com/supabase-community/mdast-jsx/commit/2cc5b2709fe428164074daf45c13d19a8c77e4c7))
* restore dist/ in gitignore and ignore local scratch dirs ([ab2437f](https://github.com/supabase-community/mdast-jsx/commit/ab2437f18692d5cf977ef1b0e8ac96658e9fab7b))

## [0.1.1](https://github.com/supabase-community/mdast-jsx/compare/v0.1.0...v0.1.1) (2026-06-25)


### Features

* cjs support ([5a3355d](https://github.com/supabase-community/mdast-jsx/commit/5a3355d708a2b9a5a3ed3967c07294ecfc7a1256))

## 0.1.0 (2026-06-25)

### Features

- initial runtime ([ce464e4](https://github.com/supabase-community/mdast-jsx/commit/ce464e4be96a9dd02c98864f71b6e8ab6777158f))
