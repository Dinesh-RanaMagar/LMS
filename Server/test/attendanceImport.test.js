import test from "node:test";
import assert from "node:assert/strict";
import xlsx from "xlsx";
import {
  getInclusiveDateRangeDays,
  parseAttendanceWorkbook,
  resolveAttendanceWorkingDays,
} from "../utils/attendanceImport.js";

test("inclusive attendance date range returns valid day count", () => {
  assert.equal(getInclusiveDateRangeDays("2083-01-22", "2083-01-22"), 1);
  assert.equal(getInclusiveDateRangeDays("2026-02-27", "2026-03-01"), 3);
  assert.equal(getInclusiveDateRangeDays("2026-02-30", "2026-03-01"), 0);
  assert.equal(getInclusiveDateRangeDays("2026-03-02", "2026-03-01"), 0);
});

test("parses R.N., Name, and Att. from an Excel attendance workbook", () => {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.aoa_to_sheet([
    ["R.N.", "Name", "Att."],
    [1, "Aadarsh Bhusal", "81/90"],
    [2, "Aarush Ale", 78],
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, "Attendance");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

  assert.deepEqual(parseAttendanceWorkbook(buffer), [
    { rowNumber: 2, rollNo: "1", name: "aadarshbhusal", presentDays: 81, reportedWorkingDays: 90, errors: [] },
    { rowNumber: 3, rollNo: "2", name: "aarushale", presentDays: 78, reportedWorkingDays: null, errors: [] },
  ]);
});

test("parses full attendance such as 92/92 as present/working days", () => {
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
    ["R.N.", "Name", "Att."],
    [1, "Aadarsh Bhusal", "92/92"],
  ]), "Attendance");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
  const [row] = parseAttendanceWorkbook(buffer);
  assert.equal(row.presentDays, 92);
  assert.equal(row.reportedWorkingDays, 92);
  assert.deepEqual(row.errors, []);
  assert.equal(resolveAttendanceWorkingDays([row]), 92);
});

test("infers common working days and rejects incomplete or conflicting fractions", () => {
  assert.equal(resolveAttendanceWorkingDays([
    { reportedWorkingDays: 92 },
    { reportedWorkingDays: 92 },
  ]), 92);
  assert.equal(resolveAttendanceWorkingDays([
    { reportedWorkingDays: 92 },
    { reportedWorkingDays: 91 },
  ]), null);
  assert.equal(resolveAttendanceWorkingDays([
    { reportedWorkingDays: 92 },
    { reportedWorkingDays: null },
  ]), null);
  assert.equal(resolveAttendanceWorkingDays([{ reportedWorkingDays: null }], '90'), 90);
});

test("rejects missing attendance headers and invalid attendance values", () => {
  const makeWorkbook = (rows) => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), "Attendance");
    return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
  };
  assert.throws(() => parseAttendanceWorkbook(makeWorkbook([["Name", "Days"], ["A", 3]])), /R\.N\., Name, and Att\./);
  const [row] = parseAttendanceWorkbook(makeWorkbook([["R.N.", "Name", "Att."], [1, "A", "many"]]));
  assert.match(row.errors[0], /present\/working days/);
});
