// Stage 4 research script.
// Runs ONCE per catalog year to build the course offering pattern data set.
// This calls the Anthropic API with web search enabled and costs money per run.
// It is never called automatically, only via `npm run research:offerings`.
// Output is cached to src/data/, all later stages read from that cache instead
// of calling this script or the API again.
//
// Depends on the Stage 3 catalog output already existing, since it only
// researches offering patterns for courses that are actually part of the
// CS BS requirements.

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATALOG_YEAR = "2024-2025";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(
  __dirname,
  "..",
  "data",
  `ucsc-cs-catalog-${CATALOG_YEAR}.json`,
);
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "data",
  `ucsc-course-offerings-${CATALOG_YEAR}.json`,
);

function collectCourseCodes(catalog) {
  const req = catalog.requirements ?? {};
  const codes = new Set();
  for (const item of req.lower_division_core ?? []) codes.add(item.code);
  for (const item of req.upper_division_core ?? []) codes.add(item.code);
  for (const item of req.math_and_science ?? []) codes.add(item.code);
  return [...codes].filter(Boolean);
}

const SYSTEM_PROMPT = `You are a research assistant building a structured data set of when UC Santa Cruz CSE courses are actually offered, based on historical scheduling patterns. You must search the web for UCSC's schedule of classes history (class search / schedule of classes archives on ucsc.edu) rather than relying on memory, since offering patterns change and are not published as a forward looking calendar.

For each course code given, look at as many recent terms of history as you can find and determine a pattern: "every_quarter", "fall_only", "winter_spring", "alternating_years", or "irregular" if no consistent pattern is visible. List the specific terms you found evidence for in "observed_terms".

Include a confidence field set to "high", "medium", or "low" for every course based on how much historical evidence you found and how consistent it is. If you found fewer than two terms of history, or the history contradicts itself, set confidence to "low" and add an entry to the top level "flags" array explaining exactly what is uncertain. Do not guess a pattern from a single data point or from general assumptions about how often courses "usually" run, an honest "irregular, low confidence" is far more useful than a confident sounding wrong pattern.

Respond with a single JSON object only, no prose before or after it, matching this shape:

{
  "school": "UC Santa Cruz",
  "catalog_year": "<catalog year>",
  "sources": ["<url>", ...],
  "offerings": {
    "<course code>": {
      "pattern": "",
      "observed_terms": [""],
      "confidence": "",
      "notes": ""
    }
  },
  "flags": [
    { "course": "", "issue": "", "confidence": "low" }
  ]
}`;

function buildUserPrompt(courseCodes) {
  return `Research the historical offering pattern for each of these UC Santa Cruz CSE courses, for the ${CATALOG_YEAR} catalog year context: ${courseCodes.join(", ")}. Use web search against UCSC's schedule of classes history. For each course, determine the offering pattern following the JSON shape given in the system prompt.`;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.",
    );
  }

  let catalog;
  try {
    const raw = await readFile(CATALOG_PATH, "utf-8");
    catalog = JSON.parse(raw);
  } catch {
    throw new Error(
      `Could not read ${CATALOG_PATH}. Run the Stage 3 catalog research script first, this script depends on its output.`,
    );
  }

  const courseCodes = collectCourseCodes(catalog);
  if (courseCodes.length === 0) {
    throw new Error(
      `No course codes found in ${CATALOG_PATH}. Check the Stage 3 output before running this script.`,
    );
  }

  const client = new Anthropic({ apiKey });

  console.log(
    `Researching offering patterns for ${courseCodes.length} courses (${CATALOG_YEAR})...`,
  );
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
    messages: [{ role: "user", content: buildUserPrompt(courseCodes) }],
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
