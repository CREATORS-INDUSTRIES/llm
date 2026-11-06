import { getLlama, LlamaChatSession, LlamaLogLevel, type GbnfJsonObjectSchema, type LlamaChatResponseChunk } from 'node-llama-cpp'
import { z } from 'zod'

export type LoadOptions = {
  system?: string
}

export type PromptOptions = {
  onToken?: (text: string) => void
  signal?: AbortSignal
}

export type SchemaPromptOptions<T> = PromptOptions & {
  schema: z.ZodType<T>
}

export type Model = {
  prompt<T>(text: string, opts: SchemaPromptOptions<T>): Promise<T>
  prompt(text: string, opts?: PromptOptions): Promise<string>
  // Tokens generated since load, including reasoning that onToken never shows.
  getTokenCount(): number
  unload(): Promise<void>
}

export async function load(modelPath: string, opts: LoadOptions = {}): Promise<Model> {
  // Failures still surface as thrown errors; the logs are llama.cpp's internals.
  const llama = await getLlama({ logLevel: LlamaLogLevel.disabled, progressLogs: false })
  const model = await llama.loadModel({ modelPath })
  const context = await model.createContext()
  const session = new LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt: opts.system })
  let tokenCount = 0

  async function prompt(text: string, { onToken, signal, schema }: PromptOptions & { schema?: z.ZodType } = {}) {
    const generation = {
      onTextChunk: onToken,
      onResponseChunk: (chunk: LlamaChatResponseChunk) => {
        tokenCount += chunk.tokens.length
      },
      signal,
    }
    if (!schema) return session.prompt(text, generation)

    // The grammar makes the model unable to emit anything but JSON of this shape; zod then checks
    // what the grammar can't express, such as string lengths or refinements.
    const { $schema: _, ...jsonSchema } = z.toJSONSchema(schema)
    const grammar = await llama.createGrammarForJsonSchema(jsonSchema as GbnfJsonObjectSchema)
    const raw = await session.prompt(text, { ...generation, grammar })
    return schema.parse(JSON.parse(raw))
  }

  return {
    prompt: prompt as Model['prompt'],
    getTokenCount: () => tokenCount,
    unload: () => llama.dispose(),
  }
}
