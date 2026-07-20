// Generates test/fixtures/sample-schedule.pdf, a fabricated UCSC Class
// Search results export used to build and test the upcoming-quarter
// schedule parser.
//
// The line structure below mirrors a REAL pisa.ucsc.edu Class Search
// results page (verified locally by running an actual search): each
// section's fields are individually labeled ("Instructor:", "Location:",
// "Day and Time:"), but several quirks are real too, not invented:
//   - "Instructor:", "Location:", "Day and Time:" put their value on the
//     NEXT line, not the same line.
//   - Enrollment ("165 of 165 Enrolled") has no label at all.
//   - "Textbooks" / "Course Readers" are boilerplate links on every row,
//     not data, and must be filtered as noise.
//   - A fully enrolled section can still say "Open" (that word reflects
//     the enrollment period being open, not seat availability) — real
//     evidence from CSE 101-01 in an actual Fall 2026 search.
//
// Course codes/titles below are real (public curriculum data, same as
// Stage 3). Instructor names, class numbers, and rooms are made up.
//
// Run with: node test/fixtures/generate-sample-schedule.js

import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "sample-schedule.pdf");

const doc = new PDFDocument({ margin: 40, size: "letter" });
doc.pipe(createWriteStream(OUTPUT_PATH));

function lines(arr) {
  for (const l of arr) doc.text(l);
}

doc.fontSize(14).text("Search Results", { underline: true });
doc.fontSize(9);
doc.text("Begin new search");
doc.text("Refine this search");
doc.moveDown(0.3);
doc.text("1 - 6 of 6");
doc.moveDown(0.3);
doc.text(
  "Term: 2026 Fall Quarter  |  Status: All Classes  |  Subject: Computer Science & Engineering  |  Asynchronous Online: A  |  Hybrid: H  |  Synchronous Online: S  |  In Person: P",
);
doc.text("Open Closed Closed with Wait List");
doc.moveDown(0.3);
doc.text("Display first");
doc.text("10");
doc.text("25");
doc.text("50");
doc.text("100");
doc.moveDown(0.5);
doc.fontSize(10);

lines([
  "CSE 101 - 01   Data Structs & Algs",
  "Class Number: 20101",
  "Instructor:",
  " Staff",
  "Location:",
  " LEC: Some Hall 100",
  "Day and Time:",
  " MWF 04:00PM-05:05PM",
  "180 of 180 Enrolled",
  " Textbooks",
  " Course Readers",
  "Instruction Mode:",
  "In Person",
  "Open",
]);

lines([
  "CSE 101 - 02   Data Structs & Algs",
  "Class Number: 20102",
  "Instructor:",
  " Rivera,J.",
  "Location:",
  " LEC: Some Hall 200",
  "Day and Time:",
  " TuTh 07:10PM-08:45PM",
  "90 of 165 Enrolled",
  " Textbooks",
  " Course Readers",
  "Instruction Mode:",
  "In Person",
  "Open",
]);

lines([
  "CSE 101M - 01   Math Thinking for CS",
  "Class Number: 20150",
  "Instructor:",
  " Chen,W.",
  "Location:",
  " LEC: Science Bldg 50",
  "Day and Time:",
  " TuTh 09:50AM-11:25AM",
  "190 of 190 Enrolled",
  " Textbooks",
  " Course Readers",
  "Instruction Mode:",
  "In Person",
  "Closed",
]);

doc.addPage();
doc.fontSize(10);

lines([
  "CSE 130 - 01   Prin Comp Sys Dsgn",
  "Class Number: 20200",
  "Instructor:",
  " Ortega,P.",
  "Location:",
  " LEC: Baskin Engr 100",
  "Day and Time:",
  " MW 02:00PM-03:35PM",
  "40 of 40 Enrolled",
  " Textbooks",
  " Course Readers",
  "Instruction Mode:",
  "In Person",
  "Wait List",
]);

lines([
  "CSE 130 - 01A   Prin Comp Sys Dsgn",
  "Class Number: 20201",
  "Instructor:",
  " Ortega,P.",
  "Location:",
  " DIS: Baskin Engr 150",
  "Day and Time:",
  " F 10:00AM-10:50AM",
  "40 of 40 Enrolled",
  " Textbooks",
  " Course Readers",
  "Instruction Mode:",
  "In Person",
  "Wait List",
]);

lines([
  "ECE 30 - 01   Engr Prin of Elec",
  "Class Number: 20300",
  "Instructor:",
  " Kumar,S.",
  "Location:",
  " LEC: Jack Baskin 152",
  "Day and Time:",
  " MWF 09:00AM-10:05AM",
  "55 of 60 Enrolled",
  " Textbooks",
  " Course Readers",
  "Instruction Mode:",
  "Hybrid",
  "Open",
]);

doc.moveDown(0.5);
doc.text("1 to 6 of 6");
doc.text("Begin new search");
doc.text("Refine this search");

doc.end();

doc.on("finish", () => {
  console.log(`Wrote ${OUTPUT_PATH}`);
});
