import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { load } from './dist/index.js'

const modelPath = process.argv[2]
if (!modelPath) {
  console.error('usage: npm run usage -- <path/to/model.gguf>')
  process.exit(1)
}

output.write(`loading ${modelPath}\n`)
const ai = await load(modelPath, { system: 'Answer briefly.' })
output.write('ready\n')

const rl = createInterface({ input, output })
rl.on('close', () => void ai.unload())
output.write('> ')

for await (const line of rl) {
  if (line.trim()) {
    await ai.prompt(line, { onToken: (t) => output.write(t) })
    output.write('\n')
  }
  output.write('> ')
}
