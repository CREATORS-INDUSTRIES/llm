import { getLlama, LlamaChatSession } from 'node-llama-cpp'

export type LoadOptions = {
  system?: string
}

export type PromptOptions = {
  onToken?: (text: string) => void
  signal?: AbortSignal
}

export type Model = {
  prompt(text: string, opts?: PromptOptions): Promise<string>
  unload(): Promise<void>
}

export async function load(modelPath: string, opts: LoadOptions = {}): Promise<Model> {
  const llama = await getLlama()
  const model = await llama.loadModel({ modelPath })
  const context = await model.createContext()
  const session = new LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt: opts.system })

  return {
    prompt: (text, { onToken, signal } = {}) => session.prompt(text, { onTextChunk: onToken, signal }),
    unload: () => llama.dispose(),
  }
}
