# Academic Planner v2, Full Degree Path Extension

## What this is

An extension of the existing Academic Planner project. The current version handles single term scheduling (input unit load and time preferences, get one quarter's schedule out). This extension adds a full 4 year degree planning layer on top of it, mapping a student's entire path to graduation based on their actual major requirements and real course offering patterns.

## Scope for v1

Starting narrow and deliberate. This is a solo build, one school, one major, to prove the pipeline before expanding.

- School: UC Santa Cruz only
- System: Quarter system only (UCSC runs quarters, this keeps modeling simpler than schools mixing quarters and semesters)
- Major: Computer Science BS
- User: Solo testing for now, not live traffic

## The pipeline

**Stage 1: Degree progress report upload**
Student uploads their UCSC degree audit PDF. Parse it to extract completed courses (course code, title, units, term completed, requirement category satisfied). UCSC's degree audit has a fairly consistent structure, but formatting can shift slightly between reports, so this needs to be resilient, not brittle regex matching.

**Stage 2: Freshman skip path**
Toggle to skip upload entirely for incoming students with zero completed courses.

**Stage 3: Curriculum catalog data**
The structured requirement data for CS at UCSC, required courses, GE buckets, elective slots, prereq chains, for a specific catalog year. This is researched once via the Claude API (with web search enabled) reading UCSC's actual catalog pages, then cached as structured data. Not scraped live per user request.

**Stage 4: Course offering patterns**
When courses actually run, fall only, every quarter, alternating years. Also researched once via API reading UCSC's schedule of classes history, then cached. This is the trickiest data to get right since UCSC doesn't publish a forward looking offering calendar, so this involves inferring patterns from historical data.

**Stage 5: Plan generation**
The actual constraint solver. Given completed courses, remaining requirements, and offering patterns, output a term by term plan to graduation. Reuses logic from the existing single term scheduler, extended across multiple terms.

## Cost strategy, read this before writing any API calls

The expensive part (API research with web search) only runs once per major per catalog year, NOT once per user. Research once, cache the output as structured data in a local JSON file or database, every subsequent request reads from cache. Do not call the API live per user request. Estimated cost per full research run (Stage 3 + Stage 4 combined) is roughly $0.50 to $1.50 using Sonnet with web search enabled. Budget for iterating on the research prompt maybe 10 to 20 times while getting it right, still well under $30 total.

## Build order

1. Set up project structure and environment (this session)
2. Build the Stage 3 research script, prompt the API to research UCSC CS requirements for a specific catalog year, output structured JSON
3. Review the output by hand for accuracy before trusting it
4. Build the Stage 4 research script for course offering patterns
5. Build Stage 1, the degree audit PDF parser
6. Build Stage 5, the plan generation engine
7. Connect to frontend, likely reusing React/TypeScript/Vite patterns from the existing planner and StudySpotFinder

## Notes

- Bhargav knows UCSC CS requirements firsthand, use that knowledge to sanity check research output rather than blindly trusting it
- All personal GitHub remotes must use git@github-personal:, not git@github.com:, per existing SSH dual account setup
- No hyphens in any user facing text or documentation written for Bhargav
