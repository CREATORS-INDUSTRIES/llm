// An interactive chat in the terminal. Every prompt remembers the ones before it.
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { load } from '../dist/index.js'

const ai = await load(process.argv[2]!, { system: 'Answer briefly.' })

const chat = ai.session()
const rl = createInterface({ input, output })
rl.on('close', () => void ai.unload())
output.write('> ')

for await (const line of rl) {
  if (line.trim()) {
    await chat.prompt(line, { onToken: (t) => output.write(t) })
    output.write('\n')
  }
  output.write('> ')
}
