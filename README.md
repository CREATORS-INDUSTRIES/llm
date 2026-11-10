![@crtrs/llm](assets/crtrs-llm.png)

The toolkit for apps that think locally.

Run LLMs on your own machine, from Node. Point to a GGUF file on disk, and talk to it.

```
npm install @crtrs/llm
```

```ts
import { load } from '@crtrs/llm'

const ai = await load('./model.gguf', { system: 'Answer briefly.' })
await ai.prompt('Hi', { onToken: (t) => process.stdout.write(t) })
await ai.unload()
```

Pass a zod schema and the reply is JSON of that shape, parsed and typed.

```ts
import { z } from 'zod'

const city = await ai.prompt('Capital of France?', {
  schema: z.object({ name: z.string(), population: z.number() }),
})
city.population // number
```

`ai.prompt` remembers nothing, so loops over many inputs never fill the context. For a conversation, open a session: each of its prompts sees the ones before it.

```ts
const chat = ai.session()
await chat.prompt('My name is Ana.')
await chat.prompt('What is my name?') // Ana
```

Give the model functions to call. It decides when, and answers from what they return.

```ts
import { load, tool } from '@crtrs/llm'

const weather = tool({
  description: 'Current weather for a city',
  params: z.object({ city: z.string() }),
  run: async ({ city }) => fetchWeather(city), // city: string
})

await ai.prompt('Weather in Paris?', { tools: { weather } })
```

```
load(modelPath, { system?, lazy? })                 -> Promise<Model>
model.prompt(text, { tools?, onToken?, signal? })   -> Promise<string>
model.prompt(text, { schema, onToken?, signal? })   -> Promise<T>
model.session({ system? })                          -> Session
session.prompt(text, { tools?, onToken?, signal? }) -> Promise<string>
session.prompt(text, { schema, onToken?, signal? }) -> Promise<T>
session.reset()                                     -> void
model.getTokenCount()                               -> number
model.unload()                                      -> Promise<void>
tool({ description?, params?, run })                -> Tool
```

`lazy` (default `true`) reads the model from disk as it's used; `false` loads it whole into memory before `load` returns, so the first prompt answers at full speed. `onToken` receives the reply's text as it's generated. `getTokenCount` returns the tokens generated since load, reasoning included. A session takes `load`'s system prompt unless given its own; `reset` clears its history and keeps that system prompt. A tool's `params` is a zod schema and the model reads back whatever `run` returns; `tools` and `schema` can't share a prompt.

Node 20+. MIT. CREATORS © 2026
