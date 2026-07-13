// Generates test/fixtures/sample-degree-audit.pdf, a fabricated UCSC degree
// progress report used to build and test the Stage 1 parser.
//
// The line breaks and column gluing below are deliberately copied from how a
// REAL UCSC "My Academic Requirements" report actually comes out of
// pdf-parse (verified locally against a real report, never committed): term
// code + year + quarter often glue with no space, course titles wrap across
// multiple lines, and credits/grade/points often glue together too. A clean,
// evenly delimited fixture would not exercise the parser honestly.
//
// All names, grades, and course history below are made up.
//
// Run with: node test/fixtures/generate-sample-degree-audit.js

import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "sample-degree-audit.pdf");

const doc = new PDFDocument({ margin: 40, size: "letter" });
doc.pipe(createWriteStream(OUTPUT_PATH));

function printHeader(pageLabel) {
  doc
    .fontSize(8)
    .text(`7/13/26, 11:19 AM${" ".repeat(60)}Student Center`)
    .text(
      "https://my.ucsc.edu/psp/csprd/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.SSS_STUDENT_CENTER.GBL?PortalKeyStruct=yes" +
        `  ${pageLabel}`,
    )
    .moveDown(0.5);
}

function sectionHeader(text) {
  doc.moveDown(0.5).fontSize(11).text(text, { underline: true }).fontSize(10);
}

function lines(arr) {
  for (const l of arr) doc.text(l);
}

printHeader("1/3");

doc.fontSize(14).text("DEGREE PROGRESS REPORT", { underline: true });
doc.fontSize(10).moveDown(0.3);
doc.text("This report last generated on 07/13/2026 11:17AM");
doc.moveDown(0.5);

doc.text("Jordan Alex Rivera");
doc.text("My Academic Requirements");
doc.text("UC Santa Cruz | Undergraduate");
doc.moveDown(0.3);
doc.text("Requirement Status:SatisfiedNot SatisfiedEnrolledException appliedCourse Status:TakenEnrolled");
doc.moveDown(0.5);

sectionHeader("Academic Summary");
doc.text("UC GPA:");
doc.text("3.10");
doc.text("2.0 minimum required");
doc.text("Total Credits:");
doc.text("132.00");
doc.text("180 credits minimum required");

sectionHeader("Academic Objectives");
doc.text("Expected Graduation Term:2027 Spring Quarter");
doc.text("Graduation Status:In Progress");
doc.text("Program:Undergraduate2023 Fall Quarter");
doc.text("Plan:Computer Science BS [Declared Major]2024 Fall Quarter");

sectionHeader("UNIVERSITY OF CALIFORNIA REQUIREMENTS");
doc.text("Satisfied:   University of California Requirements (RG2394)");
lines(["  UC AH&I: American History ", "  UC AH&I: American Institutions ", "  UC ELWR: Entry Level Writing "]);

sectionHeader("GENERAL EDUCATION REQUIREMENTS *excluding DC");
doc.text("Not Satisfied:   All general education courses must be passed with a grade of C/P or better. (RG2395)");
lines([
  "  GE CC: Cross-Cultural Analysis ",
  "  GE MF: Mathematical and Formal Reasoning ",
  "  GE TA: Textual Analysis ",
  "  GE PE: Perspectives ",
  "  GE PR: Practice ",
  "  GE C: Composition ",
  "  GE ER: Ethnicity and Race ",
  "  GE IM: Interpreting Art and Media ",
  "  GE SI: Scientific Inquiry ",
  "  GE SR: Statistical Reasoning ",
  "  GE DC: Disciplinary Communication ",
]);

doc.addPage();
printHeader("2/3");

sectionHeader("CMPSBS - LOWER-DIVISION REQUIREMENTS (2024-25 Catalog)");
doc.text("Satisfied:   Computer Science B.S. Lower-Division Requirements (RG2765)");
doc.text("All Major Courses Must be Taken for a Letter Grade (R2158)");
doc.text("Satisfied:   Computer Science and Engineering (R2311)");
lines(["    CSE 12 ", "    CSE 16 ", "    CSE 20 ", "    CSE 30 ", "    CSE 40 Test Out ", "    CSE 13S "]);
doc.text("Satisfied:   Mathematics (R483)");
lines(["    MATH 19A or 20A ", "    MATH 19B or 20B "]);
doc.text("Satisfied:   Applied Mathematics (R482)");
lines(["    AM 10 or MATH 21 ", "    AM 30 or MATH 23A ", "    ECE 30 "]);

sectionHeader("CMPSBS - UPPER-DIVISION REQUIREMENTS (2024-25 Catalog)");
doc.text("Not Satisfied:   Computer Science B.S. Upper-Division Requirements (RG2766)");
doc.text("Satisfied:   Computer Science and Engineering (R122)");
lines(["    CSE 101 ", "    CSE 101M ", "    CSE 102 or 103 ", "    CSE 112 or 114A ", "    CSE 120 ", "    CSE 130 "]);
doc.text("Not Satisfied:   Statistics (R123)");
doc.text("    STAT 131 or CSE 107 ");
doc.text("Not Satisfied:   Electives (R3243)");
doc.text(
  "Four electives. At least one must be CSE and at most two can be from applied mathematics, statistics or mathematics. (R3243)",
);
lines(["    Elective 1: CSE ", "    Elective 2 ", "    Elective 3 ", "    Elective 4 "]);
doc.text("Not Satisfied:   DC: Disciplinary Communication for Computer Science B.S. (R867)");
doc.text("    Complete ONE of: CSE 115A, 185E, or 185S ");
doc.text("Enrolled:   Comprehensive Requirement (R55)");
doc.text("    Option 1: Capstone Course ");

doc.addPage();
printHeader("3/3");

sectionHeader("Double Counting");
doc.text("Computer Science BS: 30 upper-division credits");
doc.text("CSE 101 (5)  CSE 102 (5)  CSE 112 (5)  CSE 115A (5)  CSE 120 (5)  CSE 130 (5)");

sectionHeader("UCSC Courses");
doc.text("*Denotes course with multiple instructors.");
doc.moveDown(0.3);
doc.fontSize(9);
doc.text("Term CourseTitle");
doc.text("Credits");
doc.text("Taken");
doc.text("Credits");
doc.text("Earned");
doc.text("Grade");
doc.text("Grade");
doc.text("Points");
doc.text("GERepeatInstructor");

// Each block below deliberately mimics the real report's inconsistent line
// wrapping and column gluing rather than a clean delimited layout.
lines([
  "22622026 SPRCSE-195-01",
  "Capstone",
  "Project",
  "5.0",
  "Rivas,S.*",
]);
lines(["22602026 WINCSE-115A-01Software Design5.05.0B+16.50  Ortega,P."]);
lines(["22602026 WINMATH-105-01Intro Numerical Anlys5.05.0B15.00  Chen,W."]);
lines(["22582025 FALLCSE-120-01Computer Architect5.05.0A-18.50  Beamer,S."]);
lines(["22582025 FALLCSE-130-01Prin Comp Sys Dsgn5.05.0B15.00  Veenstra,K."]);
lines(["22582025 FALLCSE-195-02Special Topics5.05.0B15.00  Rivas,S."]);
lines([
  "22522025 SPRCSE-107-01",
  "Probability/Stats",
  "5.05.0A-18.50SR",
  "Tantalo,P.",
]);
lines(["22522025 SPRCSE-112-01Netwk & Distrib Sys5.05.0B+16.50  Krintz,C."]);
lines([
  "22502025 WINCSE-101-01",
  "Data Structs & Algs",
  "5.05.0B-13.50 ",
  "Repeat of F",
  "Montazeri,N.",
]);
lines(["22502025 WINCSE-102-01Intro Algorthm Anyl5.05.0C10.00  Tantalo,P."]);
lines([
  "22482024 FALLCSE-101-01",
  "Data Structs & Algs",
  "5.0 F ",
  "Montazeri,N.",
]);
lines(["22482024 FALLECE-30-01Engr Prin of Elec5.05.0B15.00SI Rolandi,M."]);
lines(["22482024 FALLHIST-50-01Survey Modern Hist5.05.0A-18.50TA Delgado,R."]);
lines(["22422024 SPRCSE-30-01Prog Abs Python7.07.0A-25.90  Campesato,O."]);
lines(["22422024 SPRAM-10-01Applied Discrete Math5.05.0B-13.50  Kumar,S."]);
lines(["22422024 SPRARTG-10-01Intro Design5.05.0A20.00PR Nakamura,J."]);
lines(["22402024 WINCSE-16-01Appl Discrete Math5.05.0B15.00MF Sherwood,T."]);
lines(["22402024 WINCSE-20-01Beginning Python5.05.0C+11.50  Flanagan,C."]);
lines(["22402024 WINMATH-19B-01Calc:Sci,Engin,Math5.05.0B15.00MF Migliore,E."]);
lines(["22382023 FALLCSE-12-01Com Sys/Assmbly Lan7.07.0B18.90  Siero,M."]);
lines(["22382023 FALLMATH-19A-01Calc:Sci,Engin,Math5.05.0A-18.50MF Migliore,E."]);
lines(["22382023 FALLWRIT-2-01Rhetoric & Inquiry5.05.0B+16.50C Joesten,D."]);

doc.moveDown(0.5);
doc.fontSize(10);
sectionHeader("Transfer Credit");
doc.fontSize(9);
doc.text("Institution Term Taken External Subject/Catalog Nbr Units Taken Grade Input Status Equivalent Subject/Catlg Nbr Units Accepted Grade");
doc.text("FOOTHILL COLLEGE2023 SUMRCIS 22B4.50APostedTRCRCSE 13S7.000A");

doc.moveDown(0.5);
doc.fontSize(10);
sectionHeader("Test Credit");
doc.fontSize(9);
doc.text("Test ID Test Component Test Date Score Status Equivalent Course Units Accepted Grade");
doc.text("APComputer Science A2023-05-085PostedCSE 205.000P");

doc.moveDown(1);
doc.fontSize(9).text("Go to top");

doc.end();

doc.on("finish", () => {
  console.log(`Wrote ${OUTPUT_PATH}`);
});
