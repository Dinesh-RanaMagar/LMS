import test from "node:test";
import assert from "node:assert/strict";
import xlsx from "xlsx";
import { parseMarksWorkbook } from "../utils/marksImport.js";

const workbookBuffer = (rows) => {
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), "Marks");
  return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
};

test("parses grouped subject TH/INT columns and strips visual mark annotations", () => {
  const parsed = parseMarksWorkbook(workbookBuffer([
    ["Roll No.", "Name", "C.NEPALI", "", "", "C.ENGLISH", "", ""],
    ["", "", "TH", "INT", "Total", "TH", "INT", "Total"],
    [1, "Student One", 16, "24*", 40, 18, 25, 43],
  ]));

  assert.deepEqual(parsed.subjects, ["C.NEPALI", "C.ENGLISH"]);
  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(parsed.rows[0].marks["C.NEPALI"], { theory: 16, practical: 24 });
  assert.deepEqual(parsed.rows[0].marks["C.ENGLISH"], { theory: 18, practical: 25 });
  assert.deepEqual(parsed.rows[0].errors, []);
});

test("imports an absence marker as zero and ignores trailing asterisks on marks", () => {
  const parsed = parseMarksWorkbook(workbookBuffer([
    ["Roll No.", "Name", "Nepali", "", "English", ""],
    ["", "", "TH", "INT", "TH", "INT"],
    [1, "Student One", "*", "12*", "  *  ", "18.5*"],
  ]));

  assert.deepEqual(parsed.rows[0].marks.Nepali, { theory: 0, practical: 12 });
  assert.deepEqual(parsed.rows[0].marks.English, { theory: 0, practical: 18.5 });
  assert.deepEqual(parsed.rows[0].errors, []);
});

test("rejects unsupported mark values instead of silently importing them", () => {
  const parsed = parseMarksWorkbook(workbookBuffer([
    ["Roll No.", "Name", "C.MATHS", ""],
    ["", "", "TH", "INT"],
    [1, "Student One", "absent", 20],
  ]));

  assert.match(parsed.rows[0].errors.join(" "), /non-numeric mark/);
});
