import test from "node:test";
import assert from "node:assert/strict";
import xlsx from "xlsx";
import {
  getAutomaticMapping,
  LEGACY_ROSTER_TEMPLATE_HEADERS,
  parseAdDate,
  parseStudentWorkbook,
  suggestClassName,
  validateBsDate,
} from "../utils/studentImport.js";
import Student from "../model/StudentModel.js";
import StudentEnrollment from "../model/StudentEnrollmentModel.js";
import AcademicYear from "../model/AcademicYearModel.js";
import ClassModel from "../model/ClassModel.js";
import {
  importStudentsFromExcel,
  downloadStudentImportTemplate,
  previewStudentImport,
} from "../controller/studentController.js";

const makeWorkbookBuffer = (rows, bookType = "xlsx") => {
  const worksheet = xlsx.utils.aoa_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Students");
  return xlsx.write(workbook, { type: "buffer", bookType });
};

const createQuery = (result) => ({
  select() { return this; },
  lean() { return Promise.resolve(result); },
});

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  status(statusCode) { this.statusCode = statusCode; return this; },
  setHeader(name, value) { this.headers[name] = value; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; },
});

test("maps the new template format and keeps phone numbers as text", () => {
  const workbook = makeWorkbookBuffer([
    ["name", "className", "section", "rollNo", "symbolNo", "dob", "gender", "fatherName", "motherName", "address", "phone", "academicYear"],
    ["Ram Bahadur", "Class 8", "A", "1", "SYM001", "2008-05-12", "Male", "Father", "Mother", "Address", "0098012345", "2082"],
  ]);
  const parsed = parseStudentWorkbook(workbook);
  assert.equal(parsed.rows[0].values.phone, "0098012345");
  assert.deepEqual(getAutomaticMapping(parsed.headers), {
    name: "name",
    className: "className",
    section: "section",
    rollNo: "rollNo",
    symbolNo: "symbolNo",
    dob: "dob",
    gender: "gender",
    fatherName: "fatherName",
    motherName: "motherName",
    address: "address",
    phone: "phone",
    academicYear: "academicYear",
  });
});

test("maps legacy spreadsheet headers and ignores unrelated columns", () => {
  const headers = [
    "Id", "Redg.No.", "Class/Sec.", "Class", "Section", "Roll No.", "Name", "Gender",
    "DOB(B.S.)", "DOB(A.D.)", "Father Name", "Father ContactNo",
    "Mother's ContactNo", "Phone", "Address", "Academic Year", "Old Extra",
  ];
  const mapping = getAutomaticMapping(headers);
  assert.equal(mapping["Id"], "legacyId");
  assert.equal(mapping["Redg.No."], "registrationNo");
  assert.equal(mapping["Class/Sec."], "classSection");
  assert.equal(mapping.Class, "className");
  assert.equal(mapping["Roll No."], "rollNo");
  assert.equal(mapping["DOB(B.S.)"], "dobBs");
  assert.equal(mapping["DOB(A.D.)"], "dob");
  assert.equal(mapping["Father ContactNo"], "fatherContactNo");
  assert.equal(mapping["Mother's ContactNo"], "motherContactNo");
  assert.equal(mapping.Phone, "phone");
  assert.equal(mapping["Old Extra"], "");
});

test("recognizes the populated school-roster CSV columns", () => {
  const headers = [
    "Id", "Regd.No.", "BoardRegdNo", "Name", "Gender", "Roll No.",
    "Class/Sec.", "DOB(B.S.)", "DOB(A.D.)", "Contact No.", "Email Id",
    "Father's Name", "Father's ContactNo", "Mother's Name", "Mother's ContactNo",
    "GuardianName", "G_ContacNo", "P.Address", "Current Address",
    "AdmissionDate(B.S.)", "AdmissionDate(A.D.)", "Card No", "Enroll No.",
    "IEMIS Code", "Class", "Section", "Blood Group", "Age Det",
  ];
  const mapping = getAutomaticMapping(headers);
  assert.equal(mapping.Id, "legacyId");
  assert.equal(mapping["Regd.No."], "registrationNo");
  assert.equal(mapping.BoardRegdNo, "boardRegdNo");
  assert.equal(mapping["Class/Sec."], "classSection");
  assert.equal(mapping["Father's ContactNo"], "fatherContactNo");
  assert.equal(mapping["Mother's ContactNo"], "motherContactNo");
  assert.equal(mapping.G_ContacNo, "guardianContactNo");
  assert.equal(mapping["P.Address"], "address");
  assert.equal(mapping["AdmissionDate(B.S.)"], "admissionDateBs");
  assert.equal(mapping["AdmissionDate(A.D.)"], "admissionDateAd");
  assert.equal(mapping["IEMIS Code"], "iemisCode");
});

test("downloads a BIFF .xls template with every requested column in order", () => {
  const response = createResponse();
  downloadStudentImportTemplate({}, response);

  assert.equal(response.headers["Content-Type"], "application/vnd.ms-excel");
  assert.match(response.headers["Content-Disposition"], /\.xls/);
  const workbook = xlsx.read(response.body, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0];
  assert.deepEqual(headers, LEGACY_ROSTER_TEMPLATE_HEADERS);
  assert.equal(headers.length, 53);
  const mapping = getAutomaticMapping(headers);
  assert.equal(Object.values(mapping).filter(Boolean).length, headers.length);
});

test("reads CSV workbooks and skips blank rows without changing source row numbers", () => {
  const workbook = makeWorkbookBuffer([
    ["Student Name", "Grade", "Class Section"],
    ["First Student", "ONE", "A"],
    ["", "", ""],
    ["Second Student", "TWO", "B"],
  ], "csv");
  const parsed = parseStudentWorkbook(workbook);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].rowNumber, 2);
  assert.equal(parsed.rows[1].rowNumber, 4);
  assert.equal(parsed.blankRows, 1);
});

test("keeps typed Excel dates as AD dates and formatted numeric phone zeros", () => {
  const worksheet = xlsx.utils.aoa_to_sheet([
    ["DOB(A.D.)", "Father ContactNo"],
    [new Date("2008-05-12T00:00:00.000Z"), 98012345],
  ]);
  worksheet.B2.z = "0000000000";
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Students");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
  const parsed = parseStudentWorkbook(buffer);
  assert.ok(parsed.rows[0].values["DOB(A.D.)"] instanceof Date);
  assert.equal(parsed.rows[0].values["Father ContactNo"], "0098012345");
});

test("requires unambiguous Gregorian dates and preserves BS inputs without conversion", () => {
  assert.equal(parseAdDate("2008-05-12").error, "");
  assert.equal(parseAdDate("12/05/2008").error, "Ambiguous AD date; use YYYY-MM-DD");
  assert.equal(parseAdDate("31/05/2008").error, "");
  assert.equal(validateBsDate("2068-05-12"), "");
});

test("suggests configured classes for exact names and legacy number words", () => {
  const configured = ["Nursery", "Class 1", "Class 2", "Class 8"];
  assert.equal(suggestClassName("ONE", configured), "Class 1");
  assert.equal(suggestClassName("EIGHT", configured), "Class 8");
  assert.equal(suggestClassName("nursery", configured), "Nursery");
  assert.equal(suggestClassName("Unknown", configured), "");
});

test("previews and imports both supported spreadsheet layouts without overwriting records", async (t) => {
  const savedStudents = [];
  const savedEnrollments = [];
  t.mock.method(ClassModel, "find", () => createQuery([
    { className: "Class 1", sections: ["A"] },
    { className: "Class 8", sections: ["A"] },
  ]));
  t.mock.method(AcademicYear, "find", () => createQuery([{ yearName: "2082" }]));
  t.mock.method(Student, "find", () => createQuery([]));
  t.mock.method(StudentEnrollment, "find", () => createQuery([]));
  t.mock.method(Student, "exists", async () => null);
  t.mock.method(Student, "create", async (fields) => {
    savedStudents.push(fields);
    return { _id: `new-student-${savedStudents.length}` };
  });
  t.mock.method(StudentEnrollment, "create", async (fields) => {
    savedEnrollments.push(fields);
    return fields;
  });

  const files = [
    {
      format: "new",
      buffer: makeWorkbookBuffer([
        ["name", "className", "section", "rollNo", "registrationNo", "symbolNo", "dob", "gender", "fatherName", "motherName", "address", "phone", "academicYear"],
        ["New Format Student", "Class 8", "A", "1", "REG-001", "SYM-001", "2008-05-12", "Female", "Parent One", "Parent Two", "Address", "0098012345", "2082"],
      ]),
      className: "Class 8",
    },
    {
      format: "legacy",
      buffer: makeWorkbookBuffer([
        ["Id", "Redg.No.", "Class", "Section", "Roll No.", "Name", "Gender", "DOB(B.S.)", "DOB(A.D.)", "Father Name", "Father ContactNo", "Address", "Academic Year", "Unused"],
        ["old-id-99", "REG-002", "ONE", "A", "2", "Legacy Format Student", "Male", "2068-05-12", "2008-05-12", "Parent Three", "0098111222", "Old address", "2082", "ignored"],
      ], "xls"),
      className: "Class 1",
    },
  ];

  for (const [index, item] of files.entries()) {
    const request = {
      file: { buffer: item.buffer },
      body: { dateFormat: "AD", classMapConfirmed: "true" },
    };
    const previewResponse = createResponse();
    await previewStudentImport(request, previewResponse);
    assert.equal(previewResponse.statusCode, 200, `${item.format} preview should succeed`);
    assert.equal(previewResponse.body.counts.ready, 1, `${item.format} row should validate`);

    const importResponse = createResponse();
    await importStudentsFromExcel(request, importResponse);
    assert.equal(importResponse.statusCode, 200, `${item.format} import should succeed`);
    assert.equal(importResponse.body.insertedCount, 1);
    assert.equal(savedStudents[index].emisCode, `REG-00${index + 1}`);
    assert.equal(savedEnrollments[index].className, item.className);
  }

  assert.equal(savedStudents[0].phone, "0098012345");
  assert.equal(savedStudents[1].phone, "0098111222");
  assert.equal(savedStudents[1].dobBs, "2068-05-12");
  assert.equal(savedStudents[1].legacyDetails.boardRegdNo, undefined);
  assert.ok(savedStudents[1].dob instanceof Date);
  assert.equal(savedStudents.some(({ name }) => name === "old-id-99"), false);
});

test("derives class and section from combined legacy Class/Sec and stores school details", async (t) => {
  const savedStudents = [];
  const savedEnrollments = [];
  t.mock.method(ClassModel, "find", () => createQuery([
    { className: "Class 8", sections: ["A"] },
  ]));
  t.mock.method(AcademicYear, "find", () => createQuery([{ yearName: "2082" }]));
  t.mock.method(AcademicYear, "findOne", () => createQuery({ yearName: "2082" }));
  t.mock.method(Student, "find", () => createQuery([]));
  t.mock.method(StudentEnrollment, "find", () => createQuery([]));
  t.mock.method(StudentEnrollment, "create", async (fields) => {
    savedEnrollments.push(fields);
    return fields;
  });
  t.mock.method(Student, "exists", async () => null);
  t.mock.method(Student, "create", async (fields) => {
    savedStudents.push(fields);
    return { _id: "combined-class-student" };
  });

  const buffer = makeWorkbookBuffer([
    ["Id", "Regd.No.", "Name", "Gender", "Roll No.", "Class/Sec.", "Father's Name", "Father's ContactNo", "P.Address", "AdmissionDate(B.S.)", "Class", "Section", "BoardRegdNo"],
    ["1184", "1184", "Sample Student", "Female", "1", "EIGHT-A", "Parent Name", "0098012345", "Sample Address", "3/22/83", "", "", "4.8051E+15"],
  ], "csv");
  const request = {
    file: { buffer },
    body: { dateFormat: "BS", classMap: JSON.stringify({ EIGHT: "Class 8" }), classMapConfirmed: "true" },
  };
  const previewResponse = createResponse();
  await previewStudentImport(request, previewResponse);
  assert.equal(previewResponse.body.rows[0].fields.className, "Class 8");
  assert.equal(previewResponse.body.rows[0].fields.section, "A");
  assert.equal(previewResponse.body.counts.ready, 1);

  const importResponse = createResponse();
  await importStudentsFromExcel(request, importResponse);
  assert.equal(importResponse.body.insertedCount, 1);
  assert.equal(savedEnrollments[0].className, "Class 8");
  assert.equal(savedEnrollments[0].section, "A");
  assert.equal(savedStudents[0].emisCode, "1184");
  assert.equal(savedStudents[0].legacyDetails.legacyId, "1184");
  assert.equal(savedStudents[0].phone, "0098012345");
  assert.equal(savedStudents[0].legacyDetails.boardRegdNo, "4.8051E+15");
  assert.equal(savedStudents[0].legacyDetails.admissionDateBs, "3/22/83");
});

test("flags known identifiers, occupied rolls, missing required values, and review-only identities", async (t) => {
  t.mock.method(ClassModel, "find", () => createQuery([
    { className: "Class 8", sections: ["A"] },
  ]));
  t.mock.method(AcademicYear, "find", () => createQuery([{ yearName: "2082" }]));
  t.mock.method(Student, "find", (filter) => createQuery(
    filter.emisCode?.$in?.includes("TAKEN") ? [{ emisCode: "TAKEN" }] : [],
  ));
  t.mock.method(StudentEnrollment, "find", (filter) => createQuery(
    filter.$or
      ? [{ academicYear: "2082", className: "Class 8", section: "A", rollNo: 9 }]
      : [],
  ));

  const buffer = makeWorkbookBuffer([
    ["Name", "Class", "Section", "Roll No.", "Redg.No.", "Academic Year"],
    ["Existing Registration", "Class 8", "A", "1", "TAKEN", "2082"],
    ["Occupied Roll", "Class 8", "A", "9", "NEW-002", "2082"],
    ["Review Required", "Class 8", "A", "10", "", "2082"],
    ["", "Class 8", "A", "11", "NEW-004", "2082"],
  ]);
  const response = createResponse();
  await previewStudentImport({
    file: { buffer },
    body: {},
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.rows.map(({ status }) => status), [
    "duplicate",
    "duplicate",
    "review",
    "invalid",
  ]);
});
