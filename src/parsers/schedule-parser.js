// Parses a UCSC pisa.ucsc.edu Class Search results export (PDF, saved once
// a quarter when the schedule publishes) into structured section data for
// the upcoming quarter. Same manual-export-then-parse pattern as the Stage
// 1 degree audit parser, since UCSC's class search only reliably shows the
// current quarter plus one quarter ahead, there is no forward calendar to
// research.
//
// Verified against a real pisa.ucsc.edu search result: each section's
// fields are individually labeled, but several real quirks matter:
//   - "Instructor:", "Location:", "Day and Time:" put their value on the
//     NEXT line, not the same line.
//   - Enrollment ("165 of 165 Enrolled") has no label at all.
//   - "Textbooks" / "Course Readers" are boilerplate on every row, not
//     data.
//   - A fully enrolled section can still say "Open" (the enrollment period
//     is open, not that seats are available) — do not treat status as a
//     proxy for seat availability, use the enrolled/capacity numbers.
import { extractPdfText } from "./pdf-text.js";

const STATUS_WORDS = new Set(["Open", "Closed", "Wait List"]);

function parseSectionBlock(headerMatch, blockText, flags) {
  const [, subject, number, section, title] = headerMatch;
  const code = `${subject} ${number}`;

  const classNumberMatch = /Class Number:\s*(\d+)/.exec(blockText);
  const instructorMatch = /Instructor:\s*\n\s*(.+)/.exec(blockText);
  const locationMatch = /Location:\s*\n\s*([A-Z]{2,4}):\s*(.+)/.exec(blockText);
  const dayTimeMatch = /Day and Time:\s*\n\s*(\S+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/.exec(blockText);
  const enrollMatch = /(\d+)\s+of\s+(\d+)\s+Enrolled/.exec(blockText);
  const modeMatch = /Instruction Mode:\s*\n\s*(.+)/.exec(blockText);
  const statusMatch = /^(Open|Closed|Wait List)\s*$/m.exec(blockText);

  if (!classNumberMatch) {
    flags.push({ area: "schedule", issue: `No class number found for ${code} - ${section}`, confidence: "low" });
  }
  if (!dayTimeMatch) {
    flags.push({ area: "schedule", issue: `Could not parse meeting days/time for ${code} - ${section}`, confidence: "low" });
  }
  if (!enrollMatch) {
    flags.push({ area: "schedule", issue: `Could not parse enrollment count for ${code} - ${section}`, confidence: "low" });
  }
  if (!statusMatch) {
    flags.push({ area: "schedule", issue: `Could not determine status (Open/Closed/Wait List) for ${code} - ${section}`, confidence: "low" });
  }

  return {
    code,
    section,
    title: title.trim(),
    class_number: classNumberMatch ? classNumberMatch[1] : null,
    instructor: instructorMatch ? instructorMatch[1].trim() : null,
    meeting_type: locationMatch ? locationMatch[1] : null,
    location: locationMatch ? locationMatch[2].trim() : null,
    days: dayTimeMatch ? dayTimeMatch[1] : null,
    start_time: dayTimeMatch ? dayTimeMatch[2] : null,
    end_time: dayTimeMatch ? dayTimeMatch[3] : null,
    enrolled: enrollMatch ? Number(enrollMatch[1]) : null,
    capacity: enrollMatch ? Number(enrollMatch[2]) : null,
    instruction_mode: modeMatch ? modeMatch[1].trim() : null,
    // "Open" reflects the enrollment period being open, not that seats are
    // available. Check enrolled/capacity separately for actual seat
    // availability, a fully enrolled section can still say "Open" here.
    status: statusMatch ? statusMatch[1] : null,
  };
}

export async function parseSchedule(pdfBuffer) {
  const rawText = await extractPdfText(pdfBuffer);
  const flags = [];

  const termMatch = /Term:\s*(\d{4})\s*(Fall|Winter|Spring|Summer)\s*Quarter/i.exec(rawText);
  const term = termMatch ? `${termMatch[2]} ${termMatch[1]}` : null;

  const headerAnchor = /^([A-Z]{2,6}) ([A-Z]?[0-9]+[A-Z]{0,3}) - ([0-9A-Z]+) +(.+)$/gm;
  const anchors = [...rawText.matchAll(headerAnchor)];

  const sections = [];
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const blockEnd = i + 1 < anchors.length ? anchors[i + 1].index : rawText.length;
    const blockText = rawText.slice(anchor.index, blockEnd);
    sections.push(parseSectionBlock(anchor, blockText, flags));
  }

  if (sections.length === 0) {
    flags.push({
      area: "schedule",
      issue: "No course sections were found at all. The export format may not match what this parser expects.",
      confidence: "low",
    });
  }

  return {
    term,
    generated_at: new Date().toISOString(),
    sections,
    flags,
  };
}
