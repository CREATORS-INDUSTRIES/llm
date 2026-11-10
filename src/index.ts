import {
  getLlama,
  LlamaChatSession,
  LlamaLogLevel,
  type ChatSessionModelFunctions,
  type GbnfJsonObjectSchema,
  type LlamaChatResponseChunk,
} from 'node-llama-cpp'
import { z } from 'zod'

export type LoadOptions = {
  system?: string
  // false reads every weight into memory before load resolves, so the first prompt doesn't wait on disk.
  lazy?: boolean
}

export type SessionOptions = {
  // Defaults to load's.
  system?: string
}

export type Tool<P = any> = {
  // What the model reads to decide when to call it.
  description?: string
  params?: z.ZodType<P>
  // The model reads back whatever this returns.
  run: (params: P) => unknown
}

// Identity: it exists so run's argument is typed from params.
export function tool<P>(definition: Tool<P>): Tool<P> {
  return definition
}

export type PromptOptions = {
  onToken?: (text: string) => void
  signal?: AbortSignal
  // Keyed by the name the model calls each one by.
  tools?: Record<string, Tool>
}

// No tools: llama.cpp can't hold a reply to a grammar and leave it free to call functions.
export type SchemaPromptOptions<T> = Omit<PromptOptions, 'tools'> & {
  schema: z.ZodType<T>
}

export type Session = {
  // Sees every earlier prompt of this session, and its reply.
  prompt<T>(text: string, opts: SchemaPromptOptions<T>): Promise<T>
  prompt(text: string, opts?: PromptOptions): Promise<string>
  // Forgets them; the system prompt stays.
  reset(): void
}

export type Model = {
  // Sees only the system prompt and its own text.
  prompt: Session['prompt']
  session(opts?: SessionOptions): Session
  // Tokens generated since load, including reasoning that onToken never shows.
  getTokenCount(): number
  unload(): Promise<void>
}

type AnyPromptOptions = PromptOptions & { schema?: z.ZodType }

function gbnf(schema: z.ZodType) {
  const { $schema: _, ...json } = z.toJSONSchema(schema)
  return json as GbnfJsonObjectSchema
}

function functions(tools: Record<string, Tool>): ChatSessionModelFunctions {
  return Object.fromEntries(
    Object.entries(tools).map(([name, { description, params, run }]) => [
      name,
      {
        description,
        params: params && gbnf(params),
        handler: (args: unknown) => run(params ? params.parse(args) : args),
      },
    ]),
  )
}

export async function load(modelPath: string, opts: LoadOptions = {}): Promise<Model> {
  // Failures still surface as thrown errors; the logs are llama.cpp's internals.
  const llama = await getLlama({ logLevel: LlamaLogLevel.disabled, progressLogs: false })
  const model = await llama.loadModel({ modelPath, useMmap: opts.lazy === false ? false : 'auto' })
  const context = await model.createContext()
  // Every session runs on this one sequence, so opening one costs no memory;
  // alternating between them re-evaluates the incoming history.
  const chat = new LlamaChatSession({ contextSequence: context.getSequence() })
  let queue: Promise<unknown> = Promise.resolve()
  let tokenCount = 0

  // Overlapping prompts on the shared sequence would cross histories.
  function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task)
    queue = result.catch(() => {})
    return result
  }

  // Mirrors LlamaChatSession's own start, which drops the system prompt for templates that have no slot for it.
  function emptyHistory(system?: string) {
    if (chat.chatWrapper.settings.supportsSystemMessages === false) return []
    return chat.chatWrapper.generateInitialChatHistory({ systemPrompt: system })
  }

  function session({ system = opts.system }: SessionOptions = {}) {
    let history = emptyHistory(system)
    const prompt = (text: string, promptOpts: AnyPromptOptions = {}) =>
      oneAtATime(async () => {
        chat.setChatHistory(history)
        const reply = await generate(text, promptOpts)
        history = chat.getChatHistory()
        return reply
      })
    // Queued, or a prompt still generating would write its reply back over the reset.
    const reset = () =>
      void oneAtATime(async () => {
        history = emptyHistory(system)
      })
    return { prompt, reset }
  }

  async function generate(text: string, { onToken, signal, schema, tools }: AnyPromptOptions) {
    if (schema && tools) throw new Error('schema and tools cannot be used in the same prompt')
    const generation = {
      onTextChunk: onToken,
      onResponseChunk: (chunk: LlamaChatResponseChunk) => {
        tokenCount += chunk.tokens.length
      },
      signal,
    }
    if (tools) return chat.prompt(text, { ...generation, functions: functions(tools) })
    if (!schema) return chat.prompt(text, generation)

    // The grammar makes the model unable to emit anything but JSON of this shape; zod then checks
    // what the grammar can't express, such as string lengths or refinements. Tool arguments get the same two passes.
    const grammar = await llama.createGrammarForJsonSchema(gbnf(schema))
    const raw = await chat.prompt(text, { ...generation, grammar })
    return schema.parse(JSON.parse(raw))
  }

  return {
    // A session that lasts one prompt.
    prompt: ((text: string, promptOpts?: AnyPromptOptions) => session().prompt(text, promptOpts)) as Model['prompt'],
    session: session as Model['session'],
    getTokenCount: () => tokenCount,
    unload: () => llama.dispose(),
  }
}
