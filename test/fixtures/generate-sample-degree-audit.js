// Generates test/fixtures/sample-degree-audit.pdf, a fabricated UCSC degree
// progress report used to build and test the Stage 1 parser.
//
// The structure (sections, table columns, term code pattern, print header
// noise) mirrors a real UCSC "My Academic Requirements" report as printed to
// PDF from the browser. All names, grades, and course history are made up.
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
    .text(`7/13/26, 11:19 AM${" ".repeat(60)}Student Center`, { continued: false })
    .text(
      "https://my.ucsc.edu/psp/csprd/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.SSS_STUDENT_CENTER.GBL?PortalKeyStruct=yes" +
        `  ${pageLabel}`,
    )
    .moveDown(0.5);
}

function sectionHeader(text) {
  doc.moveDown(0.5).fontSize(11).text(text, { underline: true }).fontSize(10);
}

printHeader("1/3");

doc.fontSize(14).text("DEGREE PROGRESS REPORT", { underline: true });
doc.fontSize(10).moveDown(0.3);
doc.text("This report last generated on 07/13/2026 11:17AM");
doc.moveDown(0.5);

doc.text("Jordan Alex Rivera");
doc.text("My Academic Requirements");
doc.text("UC Santa Cruz | Undergraduate");
doc.moveDown(0.5);

sectionHeader("Academic Summary");
doc.text("UC GPA: 3.10 (2.0 minimum required)");
doc.text("Total Credits: 132.00 (180 credits minimum required)");
doc.text("% Graded Pass(P): 1.5% (No more than 25%)");
doc.text("Senior Residency: [NOT SATISFIED]");

sectionHeader("Academic Objectives");
doc.text("Expected Graduation Term: 2027 Spring Quarter");
doc.text("Graduation Status: In Progress");
doc.text("Program: Undergraduate | Req (Catalog) Term: 2023 Fall Quarter");
doc.text("Plan: Computer Science BS [Declared Major] | Req (Catalog) Term: 2024 Fall Quarter");

sectionHeader("UNIVERSITY OF CALIFORNIA REQUIREMENTS");
doc.text("[SATISFIED] University of California Requirements (RG2394)");
doc.text("  [SATISFIED] UC AH&I: American History");
doc.text("  [SATISFIED] UC AH&I: American Institutions");
doc.text("  [SATISFIED] UC ELWR: Entry Level Writing");

sectionHeader("GENERAL EDUCATION REQUIREMENTS *excluding DC");
doc.text("[NOT SATISFIED] All general education courses must be passed with a grade of C/P or better. (RG2395)");
doc.text("  [SATISFIED] GE CC: Cross-Cultural Analysis");
doc.text("  [SATISFIED] GE MF: Mathematical and Formal Reasoning");
doc.text("  [SATISFIED] GE TA: Textual Analysis");
doc.text("  [SATISFIED] GE PE: Perspectives");
doc.text("  [SATISFIED] GE PR: Practice");
doc.text("  [SATISFIED] GE C: Composition");
doc.text("  [NOT SATISFIED] GE ER: Ethnicity and Race");
doc.text("  [NOT SATISFIED] GE IM: Interpreting Art and Media");
doc.text("  [NOT SATISFIED] GE SI: Scientific Inquiry");
doc.text("  [NOT SATISFIED] GE SR: Statistical Reasoning");
doc.text(
  "  [NOT SATISFIED] GE DC: Disciplinary Communication - must satisfy the DC requirement of the major, see Upper-Division Requirements (R539)",
);

doc.addPage();
printHeader("2/3");

sectionHeader("CMPSBS - LOWER-DIVISION REQUIREMENTS (2024-25 Catalog)");
doc.text("[SATISFIED] Computer Science B.S. Lower-Division Requirements (RG2765)");
doc.text("All Major Courses Must be Taken for a Letter Grade (R2158)");
doc.text("  [SATISFIED] Computer Science and Engineering (R2311)");
doc.text("    CSE 12");
doc.text("    CSE 16");
doc.text("    CSE 20");
doc.text("    CSE 30");
doc.text("    CSE 40 Test Out");
doc.text("    CSE 13S");
doc.text("  [SATISFIED] Mathematics (R483)");
doc.text("    MATH 19A or 20A");
doc.text("    MATH 19B or 20B");
doc.text("  [SATISFIED] Applied Mathematics (R482)");
doc.text("    AM 10 or MATH 21");
doc.text("    AM 30 or MATH 23A");
doc.text("    ECE 30");

sectionHeader("CMPSBS - UPPER-DIVISION REQUIREMENTS (2024-25 Catalog)");
doc.text("[NOT SATISFIED] Computer Science B.S. Upper-Division Requirements (RG2766)");
doc.text("  [SATISFIED] Computer Science and Engineering (R122)");
doc.text("    CSE 101");
doc.text("    CSE 101M");
doc.text("    CSE 102 or 103");
doc.text("    CSE 112 or 114A");
doc.text("    CSE 120");
doc.text("    CSE 130");
doc.text("  [NOT SATISFIED] Statistics (R123)");
doc.text("    STAT 131 or CSE 107");
doc.text("  [NOT SATISFIED] Electives (R3243)");
doc.text(
  "    Four electives. At least one must be CSE and at most two can be from applied mathematics, statistics or mathematics.",
);
doc.text("    Elective 1: CSE 195");
doc.text("    Elective 2");
doc.text("    Elective 3");
doc.text("    Elective 4");

doc.text("  [NOT SATISFIED] DC: Disciplinary Communication for Computer Science B.S. (R867)");
doc.text("    Complete ONE of: CSE 115A, 185E, or 185S");
doc.text("  [ENROLLED] Comprehensive Requirement (R55)");
doc.text("    Option 1: Capstone Course");

doc.addPage();
printHeader("3/3");

sectionHeader("Double Counting");
doc.text("Computer Science BS: 30 upper-division credits");
doc.text("CSE 101 (5)  CSE 102 (5)  CSE 112 (5)  CSE 115A (5)  CSE 120 (5)  CSE 130 (5)");

sectionHeader("UCSC Courses");
doc.text("*Denotes course with multiple instructors.");
doc.moveDown(0.3);
doc.fontSize(9);

const courseRows = [
  ["2262", "2026 SPR", "CSE-195-01", "Capstone Project", "5.0", "", "", "", "", "", "Rivas,K.*"],
  ["2260", "2026 WIN", "CSE-115A-01", "Software Design", "5.0", "5.0", "B+", "16.50", "", "", "Ortega,P."],
  ["2260", "2026 WIN", "MATH-105-01", "Intro Numerical Anlys", "5.0", "5.0", "B", "15.00", "", "", "Chen,W."],
  ["2258", "2025 FALL", "CSE-120-01", "Computer Architect", "5.0", "5.0", "A-", "18.50", "", "", "Beamer,S."],
  ["2258", "2025 FALL", "CSE-130-01", "Prin Comp Sys Dsgn", "5.0", "5.0", "B", "15.00", "", "", "Veenstra,K."],
  ["2258", "2025 FALL", "CSE-195-02", "Special Topics", "5.0", "5.0", "B", "15.00", "", "", "Rivas,K."],
  ["2252", "2025 SPR", "CSE-107-01", "Probability/Stats", "5.0", "5.0", "A-", "18.50", "SR", "", "Tantalo,P."],
  ["2252", "2025 SPR", "CSE-112-01", "Netwk & Distrib Sys", "5.0", "5.0", "B+", "16.50", "", "", "Krintz,C."],
  ["2250", "2025 WIN", "CSE-101-01", "Data Structs & Algs", "5.0", "5.0", "B-", "13.50", "", "Repeat of F", "Montazeri,N."],
  ["2250", "2025 WIN", "CSE-102-01", "Intro Algorthm Anyl", "5.0", "5.0", "C", "10.00", "", "", "Tantalo,P."],
  ["2248", "2024 FALL", "CSE-101-01", "Data Structs & Algs", "5.0", "", "F", "0.00", "", "", "Montazeri,N."],
  ["2248", "2024 FALL", "ECE-30-01", "Engr Prin of Elec", "5.0", "5.0", "B", "15.00", "SI", "", "Rolandi,M."],
  ["2248", "2024 FALL", "HIST-50-01", "Survey Modern Hist", "5.0", "5.0", "A-", "18.50", "TA", "", "Delgado,R."],
  ["2242", "2024 SPR", "CSE-30-01", "Prog Abs Python", "7.0", "7.0", "A-", "25.90", "", "", "Campesato,O."],
  ["2242", "2024 SPR", "AM-10-01", "Applied Discrete Math", "5.0", "5.0", "B-", "13.50", "", "", "Kumar,S."],
  ["2242", "2024 SPR", "ARTG-10-01", "Intro Design", "5.0", "5.0", "A", "20.00", "PR", "", "Nakamura,J."],
  ["2240", "2024 WIN", "CSE-16-01", "Appl Discrete Math", "5.0", "5.0", "B", "15.00", "MF", "", "Sherwood,T."],
  ["2240", "2024 WIN", "CSE-20-01", "Beginning Python", "5.0", "5.0", "C+", "11.50", "", "", "Flanagan,C."],
  ["2240", "2024 WIN", "MATH-19B-01", "Calc:Sci,Engin,Math", "5.0", "5.0", "B", "15.00", "MF", "", "Migliore,E."],
  ["2238", "2023 FALL", "CSE-12-01", "Com Sys/Assmbly Lan", "7.0", "7.0", "B", "18.90", "", "", "Siero,M."],
  ["2238", "2023 FALL", "MATH-19A-01", "Calc:Sci,Engin,Math", "5.0", "5.0", "A-", "18.50", "MF", "", "Migliore,E."],
  ["2238", "2023 FALL", "WRIT-2-01", "Rhetoric & Inquiry", "5.0", "5.0", "B+", "16.50", "C", "", "Joesten,D."],
];

for (const row of courseRows) {
  doc.text(row.join("  |  "));
}

doc.moveDown(0.5);
doc.fontSize(10);
sectionHeader("Transfer Credit");
doc.fontSize(9);
doc.text("Institution  |  Term Taken  |  External Subject/Catalog Nbr  |  Units Taken  |  Grade  |  Status  |  Equivalent Subject/Catlg Nbr  |  Units Accepted  |  Grade");
doc.text("FOOTHILL COLLEGE  |  2023 SUMR  |  CIS 22B  |  4.50  |  A  |  Posted  |  CSE 13S  |  7.000  |  A");

doc.moveDown(0.5);
doc.fontSize(10);
sectionHeader("Test Credit");
doc.fontSize(9);
doc.text("Test ID  |  Test Component  |  Test Date  |  Score  |  Status  |  Equivalent Course  |  Units Accepted  |  Grade");
doc.text("AP  |  Computer Science A  |  2023-05-08  |  5  |  Posted  |  CSE 20  |  5.000  |  P");

doc.moveDown(1);
doc.fontSize(9).text("Go to top", { link: "#top" });

doc.end();

doc.on("finish", () => {
  console.log(`Wrote ${OUTPUT_PATH}`);
});
