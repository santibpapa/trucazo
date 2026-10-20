import { readFile, mkdir, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { TwaGenerator, TwaManifest, ConsoleLog, fetchUtils } from '@bubblewrap/core'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = `${root}android/generated`
const config = JSON.parse(await readFile(`${root}android/twa-manifest.json`, 'utf8'))
const icon = await readFile(`${root}public/icon-512.png`)
fetchUtils.setFetchEngine('node-fetch')
// Generar los iconos desde el archivo versionado, no desde un deploy mutable.
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'image/png' }); response.end(icon)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
try {
  const iconUrl = `http://127.0.0.1:${server.address().port}/icon.png`
  const manifest = new TwaManifest({ ...config, iconUrl, maskableIconUrl: iconUrl })
  const error = manifest.validate()
  if (error) throw new Error(error)
  await rm(output, { recursive: true, force: true })
  await mkdir(output, { recursive: true })
  await new TwaGenerator().createTwaProject(output, manifest, new ConsoleLog('Trucazo Android'))
  console.log(`Proyecto generado en ${output}. Paquete: ${config.packageId}`)
} finally { await new Promise(resolve => server.close(resolve)) }
