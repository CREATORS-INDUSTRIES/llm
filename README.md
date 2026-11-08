# @crtrs/llm

The toolkit for apps that think locally.

@crtrs/llm runs AI models on your own machine, from Node. Point to a GGUF file on disk, and talk to it.

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

```
load(modelPath, { system?, lazy? })                 -> Promise<Model>
model.prompt(text, { onToken?, signal? })           -> Promise<string>
model.prompt(text, { schema, onToken?, signal? })   -> Promise<T>
model.getTokenCount()                               -> number
model.unload()                                      -> Promise<void>
```

`lazy` (default `true`) reads the model from disk as it's used; `false` loads it whole into memory before `load` returns, so the first prompt answers at full speed. `onToken` receives the reply's text as it's generated. `getTokenCount` returns the tokens generated since load, reasoning included.

Node 20+. MIT. CREATORS © 2026
