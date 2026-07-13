// Stage 1: parses a UCSC "My Academic Requirements" degree progress report
// (PDF, typically saved via the browser's print to PDF, since UCSC does not
// offer a direct PDF download) into structured completed course data.
//
// Import pdf-parse's internal lib module directly rather than the package
// root. The package root's index.js has a debug-mode block that runs a test
// file read whenever module.parent is falsy, which is always true under
// dynamic ESM import and crashes with ENOENT unrelated to the input file.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// UCSC term codes are not arbitrary: "2" + last two digits of the year +
// a quarter digit (Winter=0, Spring=2, Summer=4, Fall=8). Decoding from this
// pattern is more reliable than trusting the adjacent printed year/quarter
// text, so both are extracted and cross checked against each other.
const QUARTER_BY_DIGIT = { 0: "Winter", 2: "Spring", 4: "Summer", 8: "Fall" };
const QUARTER_LABEL_TO_DIGIT = { WIN: 0, SPR: 2, SUM: 4, FALL: 8 };

const GRADE_PATTERN = "(?:A\\+|A-|A|B\\+|B-|B|C\\+|C-|C|D\\+|D-|D|F|P|NP|W|I)";
const GE_CODES = new Set([
  "AH&I",
  "CC",
  "ER",
  "IM",
  "MF",
  "SI",
  "SR",
  "TA",
  "PE",
  "PR",
  "C",
  "DC",
]);

function decodeTermCode(code) {
  const match = /^2(\d{2})(\d)$/.exec(code);
  if (!match) return null;
  const [, yearDigits, quarterDigit] = match;
  const quarter = QUARTER_BY_DIGIT[quarterDigit];
  if (!quarter) return null;
  return { year: 2000 + Number(yearDigits), quarter };
}

function stripPrintArtifacts(text) {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*[AP]M/.test(trimmed)) return false;
      if (/^https:\/\/my\.ucsc\.edu\//.test(trimmed)) return false;
      if (trimmed === "Go to top") return false;
      if (trimmed === "Student Center") return false;
      return true;
    })
    .join("\n");
}

function sliceSection(text, startMarker, endMarkers) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return null;
  const afterStart = text.slice(startIdx + startMarker.length);
  let endIdx = afterStart.length;
  for (const marker of endMarkers) {
    const idx = afterStart.indexOf(marker);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }
  return afterStart.slice(0, endIdx);
}

function extractAcademicObjectives(text) {
  const programMatch = /Program:\s*Undergraduate\s*(\d{4})\s*(Fall|Winter|Spring|Summer)\s*Quarter/i.exec(text);
  const planMatch = /Plan:\s*(.+?)\s*\[Declared Major\]\s*(\d{4})\s*(Fall|Winter|Spring|Summer)\s*Quarter/i.exec(text);
  const gradTermMatch = /Expected Graduation Term:\s*(\d{4})\s*(Fall|Winter|Spring|Summer)\s*Quarter/i.exec(text);

  return {
    declared_major: planMatch ? planMatch[1].trim() : null,
    major_catalog_year_term: planMatch ? `${planMatch[2]} ${planMatch[3]} Quarter` : null,
    program_catalog_year_term: programMatch ? `${programMatch[1]} ${programMatch[2]} Quarter` : null,
    expected_graduation_term: gradTermMatch ? `${gradTermMatch[1]} ${gradTermMatch[2]} Quarter` : null,
  };
}

// Requirement groups are only reliably labeled "Satisfied:" or
// "Not Satisfied:" (or "Enrolled:") at the group level in extracted text,
// since the per-item checkmark/X icons are graphical and do not extract.
// Individual course-to-requirement-slot attribution is intentionally left to
// Stage 5, which can cross reference completed courses against the
// structured Stage 3 catalog data instead of relying on this PDF for it.
function parseRequirementGroups(text) {
  const groups = [];
  const groupRegex = /(Satisfied|Not Satisfied|Enrolled):\s{1,4}([^\n(]+?)(?:\s*\(([A-Z0-9]+)\))?\n/g;
  let match;
  while ((match = groupRegex.exec(text)) !== null) {
    const [, status, description, ruleId] = match;
    groups.push({
      description: description.trim(),
      rule_id: ruleId ?? null,
      status: status === "Satisfied" ? "satisfied" : status === "Enrolled" ? "enrolled" : "not_satisfied",
    });
  }
  return groups;
}

// Splits a glued digit run like "5.05.0" (credits taken + credits earned,
// each always a single fraction digit) into its parts. Falls back to a
// single value when there is only one credits figure (e.g. an F, where
// credits earned is blank).
function splitCreditsRun(digitsRun) {
  const both = /^(\d{1,2}\.\d)(\d{1,2}\.\d)$/.exec(digitsRun);
  if (both) return [both[1], both[2]];
  const single = /^(\d{1,2}\.\d)$/.exec(digitsRun);
  if (single) return [single[1], null];
  return [null, null];
}

function parseCourseRow(rawBlob, sourceLabel, flags) {
  const blob = rawBlob.replace(/\s+/g, " ").trim();

  const codeMatch = /([A-Z]{2,6})-\s*([0-9]+[A-Z]{0,2})-(\d{2})/.exec(blob);
  if (!codeMatch) {
    flags.push({ area: sourceLabel, issue: `Could not find a course code in row: "${blob}"`, confidence: "low" });
    return null;
  }
  const [, subject, number] = codeMatch;
  const code = `${subject} ${number}`;

  const instructorMatch = /([A-Z][a-zA-Z'\-]+,\s*[A-Z]\.\*?)\s*$/.exec(blob);
  const instructor = instructorMatch ? instructorMatch[1].trim() : null;
  const beforeInstructor = instructorMatch ? blob.slice(0, instructorMatch.index) : blob;

  const afterCode = beforeInstructor.slice(codeMatch.index + codeMatch[0].length);

  // A bare letter grade (like "C") is not a safe anchor on its own: course
  // titles routinely contain standalone capital letters too ("CS", "C Prog"
  // for a C programming course). The credits digit run immediately before
  // the grade is a much safer anchor, since titles never contain a decimal
  // number, so the grade is only recognized when it's glued (or a single
  // space away from) that digit run.
  const clusterMatch = new RegExp(
    `(\\d{1,2}\\.\\d(?:\\d{1,2}\\.\\d)?)\\s?(${GRADE_PATTERN})(\\d{1,3}\\.\\d{2})?`,
  ).exec(afterCode);

  let creditsTaken = null;
  let creditsEarned = null;
  let gradePoints = null;
  let geCode = null;
  let repeatNote = null;
  let title = null;
  let grade = null;

  if (clusterMatch) {
    const [, creditsRun, matchedGrade, points] = clusterMatch;
    grade = matchedGrade;
    [creditsTaken, creditsEarned] = splitCreditsRun(creditsRun);
    gradePoints = points ?? null;

    title = afterCode.slice(0, clusterMatch.index).trim() || null;

    let afterCluster = afterCode.slice(clusterMatch.index + clusterMatch[0].length);
    const geMatch = /^\s*([A-Z]{1,4})(?=\s|$)/.exec(afterCluster);
    if (geMatch && GE_CODES.has(geMatch[1])) {
      geCode = geMatch[1];
      afterCluster = afterCluster.slice(geMatch.index + geMatch[0].length);
    }

    const repeatMatch = /Repeat[A-Za-z0-9,+\- ]*/.exec(afterCluster);
    if (repeatMatch) repeatNote = repeatMatch[0].trim();
  } else {
    const creditsMatch = /(\d{1,2}\.\d)\s*$/.exec(afterCode);
    if (creditsMatch) {
      creditsTaken = creditsMatch[1];
      title = afterCode.slice(0, creditsMatch.index).trim() || null;
    } else {
      title = afterCode.trim() || null;
    }
  }

  let status;
  if (grade && creditsEarned) status = "completed";
  else if (grade && !creditsEarned) status = "not_earned";
  else status = "enrolled";

  if (!grade && status !== "enrolled") {
    flags.push({ area: sourceLabel, issue: `No grade found for ${code} in row: "${blob}"`, confidence: "low" });
  }
  if (!creditsTaken) {
    flags.push({ area: sourceLabel, issue: `No credits taken found for ${code} in row: "${blob}"`, confidence: "low" });
  }

  return {
    code,
    title,
    credits_taken: creditsTaken ? Number(creditsTaken) : null,
    credits_earned: creditsEarned ? Number(creditsEarned) : null,
    grade,
    grade_points: gradePoints ? Number(gradePoints) : null,
    ge_code: geCode,
    repeat_note: repeatNote,
    instructor,
    status,
    source: sourceLabel,
  };
}

// The UCSC Courses table has no reliable per-row delimiter. Rows are found
// by anchoring on the term code pattern ("2" + 2 digit year + quarter
// digit, immediately followed by the year and a quarter abbreviation), then
// everything up to the next anchor is treated as one row's raw text, which
// may itself be split across several physical lines.
function parseCourseTable(sectionText, flags) {
  const rowAnchor = /(2\d{2}[0248])\s*(\d{4})\s*(WIN|SPR|SUM|FALL)/g;
  const anchors = [...sectionText.matchAll(rowAnchor)];
  const courses = [];

  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const nextStart = i + 1 < anchors.length ? anchors[i + 1].index : sectionText.length;
    const rowText = sectionText.slice(anchor.index, nextStart);
    const rowBody = rowText.slice(anchor[0].length);

    const termInfo = decodeTermCode(anchor[1]);
    const printedYear = Number(anchor[2]);
    const printedQuarter = { WIN: "Winter", SPR: "Spring", SUM: "Summer", FALL: "Fall" }[anchor[3]];

    if (!termInfo || termInfo.year !== printedYear || termInfo.quarter !== printedQuarter) {
      flags.push({
        area: "ucsc_courses",
        issue: `Term code ${anchor[1]} decoded to ${termInfo?.year} ${termInfo?.quarter}, but printed text says ${printedYear} ${printedQuarter}`,
        confidence: "low",
      });
    }

    const parsed = parseCourseRow(rowBody, "ucsc_courses", flags);
    if (parsed) {
      courses.push({
        ...parsed,
        term: termInfo ? `${termInfo.quarter} ${termInfo.year}` : `${printedQuarter} ${printedYear}`,
        term_code: anchor[1],
      });
    }
  }

  return courses;
}

// The Transfer Credit table is the least uniform section in the whole
// report. Some rows map to an actual UCSC course with a unit conversion
// (e.g. "CSE 13S", 7.000 units), and some map to a bare GE bucket code with
// no unit figure at all, because the same external course can satisfy more
// than one internal requirement and only gets a unit conversion once. Rows
// are found by anchoring on the institution name (ends in COLLEGE or
// UNIVERSITY, immediately followed by a year), and the front half (external
// course + units taken + grade, up through "Posted") is reliable, but the
// "equivalent" half after "Posted" is parsed leniently and flagged when it
// doesn't resolve to a normal SUBJECT NUMBER course code.
function parseTransferCredit(sectionText, flags) {
  const blob = sectionText.replace(/\s+/g, " ").trim();
  const institutionAnchor = /[A-Z][A-Z .&']*(?:COLLEGE|UNIVERSITY)(?=\d{4})/g;
  const anchors = [...blob.matchAll(institutionAnchor)];
  const rows = [];

  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const nextStart = i + 1 < anchors.length ? anchors[i + 1].index : blob.length;
    const rowText = blob.slice(anchor.index, nextStart);
    const institution = anchor[0].trim();
    const rowBody = rowText.slice(anchor[0].length);

    const frontMatch =
      /^\d{4}\s*(?:SUMR|FALL|WIN|SPR)([A-Z]{2,6})\s*([A-Z]?[0-9]+[A-Z]{0,3})(\d{1,2}\.\d{2})([A-Z][+-]?)Posted/.exec(
        rowBody,
      );
    if (!frontMatch) {
      flags.push({ area: "transfer_credit", issue: `Could not parse external course details for ${institution}: "${rowBody}"`, confidence: "low" });
      continue;
    }
    const [, , externalNumber, unitsTaken, gradeIn] = frontMatch;

    const equivalentText = rowBody.slice(frontMatch.index + frontMatch[0].length).replace(/^TRCR\s*/, "").trim();
    const equivMatch = /^([A-Z]{2,6})\s*([A-Z]?[0-9]+[A-Z]{0,3})?\s*(\d{1,2}\.\d{3})?\s*([A-Z][+-]?)$/.exec(
      equivalentText,
    );

    if (!equivMatch) {
      flags.push({ area: "transfer_credit", issue: `Could not parse the UCSC-equivalent side for ${institution} ${externalNumber}: "${equivalentText}"`, confidence: "low" });
      continue;
    }
    const [, equivSubject, equivNumber, unitsAccepted, equivGrade] = equivMatch;

    if (!equivNumber || !unitsAccepted) {
      flags.push({
        area: "transfer_credit",
        issue: `${institution} ${externalNumber} maps to "${equivalentText}", which doesn't look like a standard course + unit mapping (likely a GE bucket credit, not a specific course)`,
        confidence: "low",
      });
    }

    rows.push({
      code: equivNumber ? `${equivSubject} ${equivNumber}` : equivSubject,
      title: null,
      credits_taken: Number(unitsTaken),
      credits_earned: unitsAccepted ? Number(unitsAccepted) : null,
      grade: equivGrade,
      grade_points: null,
      ge_code: null,
      repeat_note: null,
      instructor: null,
      status: unitsAccepted ? "completed" : "unmapped_ge_credit",
      source: "transfer_credit",
      external_institution: institution,
      external_grade: gradeIn,
    });
  }

  return rows;
}

function parseTestCredit(sectionText, flags) {
  const blob = sectionText.replace(/\s+/g, " ").trim();
  const rowRegex = /(AP|IB|SAT|A-LEVEL)([A-Za-z ]+?)(\d{4}-\d{2}-\d{2})(\d+)Posted([A-Z]{2,6})\s*([0-9]+[A-Z]{0,2}?)(\d{1,2}\.\d{3})([A-Z][+-]?|P)/g;
  const rows = [];
  let match;
  while ((match = rowRegex.exec(blob)) !== null) {
    const [, testId, component, testDate, score, equivSubject, equivNumber, unitsAccepted, grade] = match;
    rows.push({
      code: `${equivSubject} ${equivNumber}`,
      title: component.trim(),
      credits_taken: null,
      credits_earned: Number(unitsAccepted),
      grade,
      grade_points: null,
      ge_code: null,
      repeat_note: null,
      instructor: null,
      status: "completed",
      source: "test_credit",
      test_id: testId,
      test_date: testDate,
      score: Number(score),
    });
  }
  return rows;
}

export async function parseDegreeAudit(pdfBuffer) {
  const { text: rawText } = await pdfParse(pdfBuffer);
  const text = stripPrintArtifacts(rawText);
  const flags = [];

  const objectives = extractAcademicObjectives(text);

  const requirementsText = sliceSection(text, "UNIVERSITY OF CALIFORNIA REQUIREMENTS", ["Double Counting", "UCSC Courses"]) ?? "";
  const requirementGroups = parseRequirementGroups(requirementsText);

  const courseSectionText = sliceSection(text, "UCSC Courses", ["Transfer Credit", "Test Credit", "Go to top"]) ?? "";
  const courses = parseCourseTable(courseSectionText, flags);

  const transferSectionText = sliceSection(text, "Transfer Credit", ["Test Credit", "Go to top"]) ?? "";
  const transferCourses = parseTransferCredit(transferSectionText, flags);

  const testSectionText = sliceSection(text, "Test Credit", ["Go to top"]) ?? "";
  const testCourses = parseTestCredit(testSectionText, flags);

  return {
    ...objectives,
    requirement_groups: requirementGroups,
    completed_courses: [...courses, ...transferCourses, ...testCourses],
    flags,
  };
}
