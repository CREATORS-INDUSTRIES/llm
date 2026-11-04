// Pull structured records out of free text.
import { z } from 'zod'
import { load } from '../dist/index.js'

const ai = await load(process.argv[2]!)

const text = `
  Ana joined in 2021 as a designer. Marc, our CTO, has been here since 2018.
  Lucía started last year in sales.
`

const { people } = await ai.prompt(`List every person in this text:\n${text}`, {
  schema: z.object({
    people: z.array(z.object({ name: z.string(), role: z.string(), since: z.number() })),
  }),
})
console.table(people)

await ai.unload()
