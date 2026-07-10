# Academic Planner v2

Full degree path planning extension. See PROJECT_BRIEF.md for full scope and decisions.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and add your Anthropic API key
3. Get a key at https://console.anthropic.com if you don't have one yet

## Next step

Open this folder in Claude Code and start with building `src/research/ucsc-cs-catalog.js`, the Stage 3 research script described in PROJECT_BRIEF.md. That script should use the Claude API with web search enabled to research UCSC's CS degree requirements for a specific catalog year and output structured JSON into `src/data/`.
