// A session forgets its conversation on reset, without reloading the model.
import { load } from '../dist/index.js'

const ai = await load(process.argv[2]!, { system: 'Answer briefly.' })
const chat = ai.session()

await chat.prompt('My name is Ana.')
console.log('before:', await chat.prompt('What is my name?'))

chat.reset()
console.log('after: ', await chat.prompt('What is my name?'))

await ai.unload()
