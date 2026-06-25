import { useState } from 'react'
import { Editor } from './components/Editor'

export function App() {
  const [code, setCode] = useState('export default <heading>Title</heading>')
  return <div style={{ height: '100vh' }}><Editor value={code} onChange={setCode} /></div>
}
