// Measure how fast a model generates, in tokens per second.
// Usage: node examples/throughput.ts <path/to/model.gguf> [runs]
import { load } from '../dist/index.js'

const [modelPath, runs = '3'] = process.argv.slice(2)
if (!modelPath) {
  console.error('usage: node examples/throughput.ts <path/to/model.gguf> [runs]')
  process.exit(1)
}

const loadStart = performance.now()
const ai = await load(modelPath)
console.log(`load: ${((performance.now() - loadStart) / 1000).toFixed(2)} s`)

const results = []
for (let run = 1; run <= Number(runs); run++) {
  const start = performance.now()
  const startCount = ai.getTokenCount()
  let first = 0
  let last = 0
  let firstCount = 0
  let lastCount = 0

  await ai.prompt('Write a 50-word essay about how lighthouses work.', {
    onToken: () => {
      last = performance.now()
      lastCount = ai.getTokenCount()
      if (!first) {
        first = last
        firstCount = lastCount
      }
    },
  })

  // Timed from the first visible token: onToken can't time the prompt evaluation and reasoning before it.
  const tokensPerSecond = (lastCount - firstCount) / ((last - first) / 1000)
  results.push({
    run,
    tokens: ai.getTokenCount() - startCount,
    'first token (ms)': Math.round(first - start),
    'tokens/s': Number(tokensPerSecond.toFixed(1)),
  })
}

console.table(results)

const average = results.reduce((sum, result) => sum + result['tokens/s'], 0) / results.length
console.log(`average: ${average.toFixed(1)} tokens/s`)

await ai.unload()
