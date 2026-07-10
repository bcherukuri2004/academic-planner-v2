// Stage 3 research script.
// Runs ONCE per catalog year to build the CS BS requirement data set.
// This calls the Anthropic API with web search enabled and costs money per run.
// It is never called automatically, only via `npm run research:catalog`.
// Output is cached to src/data/, all later stages read from that cache instead
// of calling this script or the API again.

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATALOG_YEAR = "2024-2025";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "data",
  `ucsc-cs-catalog-${CATALOG_YEAR}.json`,
);

const SYSTEM_PROMPT = `You are a research assistant building a structured data set of UC Santa Cruz's Computer Science BS degree requirements for a specific catalog year. You must search the web for UCSC's official catalog site (catalog.ucsc.edu) and the CSE department pages rather than relying on memory, since requirements change by catalog year and memorized details are frequently wrong or stale.

For every requirement item you extract, include a confidence field set to "high", "medium", or "low" based on how directly the source text supported that item. If the catalog language is ambiguous, contradictory across pages, or you could not find a source for a specific detail, set confidence to "low" and add an entry to the top level "flags" array describing exactly what is uncertain and why. Do not guess or fill in gaps with plausible sounding defaults, an incomplete field marked low confidence is far more useful than a confident sounding wrong answer.

Only extract your own structured summary: course codes, titles, units, prerequisite course codes, and short rule descriptions. Do not copy long verbatim passages of catalog text into any field.

Respond with a single JSON object only, no prose before or after it, matching this shape:

{
  "school": "UC Santa Cruz",
  "major": "Computer Science",
  "degree": "BS",
  "catalog_year": "<catalog year>",
  "sources": ["<url>", ...],
  "requirements": {
    "lower_division_core": [
      { "code": "", "title": "", "units": 0, "prereqs": [""], "confidence": "" }
    ],
    "upper_division_core": [
      { "code": "", "title": "", "units": 0, "prereqs": [""], "confidence": "" }
    ],
    "electives": {
      "upper_division_units_required": 0,
      "rules": "",
      "confidence": ""
    },
    "math_and_science": [
      { "code": "", "title": "", "units": 0, "prereqs": [""], "confidence": "" }
    ],
    "capstone": { "description": "", "confidence": "" },
    "total_units_for_degree": 0
  },
  "flags": [
    { "area": "", "issue": "", "confidence": "low" }
  ]
}`;

const USER_PROMPT = `Research UC Santa Cruz's Computer Science BS degree requirements for the ${CATALOG_YEAR} catalog year. Use web search against catalog.ucsc.edu and the CSE department course pages. Extract the lower division core, upper division core, elective requirements, math and science requirements, capstone/senior requirement, and total units required for the degree, following the JSON shape given in the system prompt.`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.",
    );
  }

  const client = new Anthropic({ apiKey });

  console.log(`Researching UCSC CS BS requirements for ${CATALOG_YEAR}...`);
  console.log("This calls the Anthropic API with web search enabled and costs money.");

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
      },
    ],
    messages: [{ role: "user", content: USER_PROMPT }],
  });

  const textBlocks = response.content.filter((block) => block.type === "text");
  const finalText = textBlocks[textBlocks.length - 1]?.text ?? "";

  let parsed;
  try {
    const jsonMatch = finalText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : finalText);
  } catch (err) {
    console.error("Could not parse model output as JSON. Raw response:");
    console.error(finalText);
    throw err;
  }

  parsed.generated_at = new Date().toISOString();
  parsed.model_used = response.model;

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(parsed, null, 2), "utf-8");

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log("Review this file by hand before trusting it in later stages.");
}

main().catch((err) => {
  console.error("Research script failed:", err.message);
  process.exit(1);
});
