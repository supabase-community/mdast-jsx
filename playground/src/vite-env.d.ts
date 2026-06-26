/// <reference types="vite/client" />

declare module 'virtual:vm-modules' {
  const mods: Record<string, string>
  export default mods
}
declare module 'virtual:mdast-type-defs' {
  const defs: { filePath: string; content: string }[]
  export default defs
}
