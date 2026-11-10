// The model calls your functions when it needs them, and answers from what they return.
import { z } from 'zod'
import { load, tool } from '../dist/index.js'

const ai = await load(process.argv[2]!, { system: 'Answer briefly.' })

const stock = { apples: 12, pears: 0 }

const checkStock = tool({
  description: 'Units in stock for a fruit',
  params: z.object({ fruit: z.enum(['apples', 'pears']) }),
  run: ({ fruit }) => {
    console.log(`[checkStock ${fruit}]`)
    return { units: stock[fruit] }
  },
})

console.log(await ai.prompt('How many apples do we have in stock?', { tools: { checkStock } }))
console.log(await ai.prompt('Do we have any pears left?', { tools: { checkStock } }))

await ai.unload()
