// A reply shaped and typed by a zod schema.
import { z } from 'zod'
import { load } from '../dist/index.js'

const ai = await load(process.argv[2]!)

const city = await ai.prompt('Capital of France?', {
  schema: z.object({ name: z.string(), country: z.string(), population: z.number() }),
})
console.log(city)
console.log(typeof city.population)

await ai.unload()
