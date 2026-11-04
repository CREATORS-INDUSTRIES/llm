@crtrs/llm

The toolkit for apps that think locally.

@crtrs/llm runs AI models on your own machine, from Node. Point to a GGUF file on disk, and talk to it.

  npm install @crtrs/llm

  import { load } from '@crtrs/llm'

  const ai = await load('./model.gguf', { system: 'Answer briefly.' })
  await ai.prompt('Hi', { onToken: (t) => process.stdout.write(t) })
  await ai.unload()

load(modelPath, { system? })         -> Promise<Model>
model.prompt(text, { onToken?, signal? }) -> Promise<string>
model.unload()                       -> Promise<void>

Node 20+. MIT. CREATORS © 2026
