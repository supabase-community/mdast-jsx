// Dev entry point for the 'automatic' JSX runtime. The dev transform imports
// `jsxDEV` from this path; we alias it to `jsx` and ignore the extra debug args
// (source location, etc.) since this runtime builds a static tree, not React.
export * from './jsx-runtime'
export { jsx as jsxDEV } from './jsx-runtime'
