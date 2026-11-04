// Print the reply as it's generated, and stop it after two seconds.
import { load } from '../dist/index.js'

const ai = await load(process.argv[2]!, { system: 'Answer briefly.' })
const signal = AbortSignal.timeout(2000)

try {
  await ai.prompt('Tell me a short story about a lighthouse.', { onToken: (t) => process.stdout.write(t), signal })
} catch (error) {
  if (!signal.aborted) throw error
  console.log('\n[stopped]')
}

await ai.unload()
