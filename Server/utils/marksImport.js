import xlsx from "xlsx";

const normalizeHeader = (value) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "");

const findIdentifierColumn = (rows, start, end, aliases) => {
  for (let rowIndex = start; rowIndex <= end; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const columnIndex = row.findIndex((value) => aliases.includes(normalizeHeader(value)));
    if (columnIndex >= 0) return columnIndex;
  }
  return -1;
};

const parseComponent = (value) => {
  const header = String(value ?? "").trim().toLowerCase();
  if (/^(th|theory)(\b|[\s(/]).*$/.test(header) || /^(th|theory)$/.test(header)) return "theory";
  if (/^(int|internal)(\b|[\s(/]).*$/.test(header) || /^(int|internal)$/.test(header)) return "practical";
  const match = header.match(/^(.+?)[\s._-]+(th|theory|int|internal)\s*$/);
  if (!match) return null;
  return {
    subjectName: match[1].trim(),
    component: ["th", "theory"].includes(match[2]) ? "theory" : "practical",
  };
};

const parseMark = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).trim().replace(/,/g, "");
  if (/^\*+$/.test(normalized)) return 0;
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*\*?\s*$/);
  return match ? Number(match[1]) : Number.NaN;
};

export const normalizeMarkSubject = (value) => String(value ?? "")
  .toLowerCase()
  .replace(/compulsory|optional/g, "")
  .replace(/^(c|opt)(?=[a-z0-9])/g, "")
  .replace(/[^a-z0-9]/g, "")
  // "C.NEPALI" / "C MATHS" mark a compulsory subject; the letter is dropped
  // only after punctuation is gone so "OPT I"/"OPT II" keep their identity.
  .replace(/^c(?=[a-z])/, "")
  // Report cards abbreviate a couple of subjects differently than the exam config.
  .replace(/^maths$/, "mathematics")
  .replace(/^healthcreativearts$/, "health");

export const parseMarksWorkbook = (buffer) => {
  let workbook;
  try {
    workbook = xlsx.read(buffer, { type: "buffer", cellDates: false });
  } catch {
    throw new Error("The spreadsheet could not be read. Please upload a valid Excel file.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The workbook does not contain a worksheet.");
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: true,
  });
  if (!rows.length) throw new Error("The worksheet is empty.");

  let headerRowIndex = -1;
  let rollColumn = -1;
  let nameColumn = -1;
  let regColumn = -1;
  let componentColumns = [];

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 20); rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const roll = findIdentifierColumn(rows, Math.max(0, rowIndex - 1), rowIndex, [
      "roll", "rollno", "rollnumber", "rollnum", "rn", "sn", "sno", "rno",
    ]);
    const name = findIdentifierColumn(rows, Math.max(0, rowIndex - 1), rowIndex, [
      "name", "studentname", "nameofstudent",
    ]);
    // Report cards also carry a registration number that maps to Student.emisCode.
    const reg = findIdentifierColumn(rows, Math.max(0, rowIndex - 1), rowIndex, [
      "regno", "reg", "regnumber", "registrationno", "emis", "emiscode", "emisno",
    ]);
    const previousRow = rows[rowIndex - 1] || [];
    let lastGroupName = "";
    const groupNames = row.map((value, columnIndex) => {
      if (String(previousRow[columnIndex] ?? "").trim()) {
        lastGroupName = String(previousRow[columnIndex]).trim();
      }
      return String(previousRow[columnIndex] ?? "").trim() || lastGroupName;
    });

    const foundComponents = [];
    row.forEach((value, columnIndex) => {
      const parsed = parseComponent(value);
      if (!parsed) return;
      if (typeof parsed === "object") {
        foundComponents.push({ columnIndex, ...parsed });
      } else if (groupNames[columnIndex]) {
        foundComponents.push({
          columnIndex,
          subjectName: groupNames[columnIndex],
          component: parsed,
        });
      }
    });

    if (roll >= 0 && name >= 0 && foundComponents.length >= 2) {
      headerRowIndex = rowIndex;
      rollColumn = roll;
      nameColumn = name;
      regColumn = reg;
      componentColumns = foundComponents;
      break;
    }
  }

  if (headerRowIndex < 0) {
    throw new Error("Could not find the header row. Include student Name, Roll No., and TH/INT columns for each subject.");
  }

  const columnsBySubject = new Map();
  for (const component of componentColumns) {
    const subjectName = component.subjectName || String(
      (rows[headerRowIndex - 1] || [])[component.columnIndex] ?? ""
    ).trim();
    if (!subjectName) continue;
    const key = normalizeMarkSubject(subjectName);
    if (!columnsBySubject.has(key)) {
      columnsBySubject.set(key, { sourceName: subjectName, columns: {} });
    }
    const entry = columnsBySubject.get(key);
    if (entry.columns[component.component] !== undefined) {
      throw new Error(`The subject "${subjectName}" has duplicate ${component.component === "theory" ? "TH" : "INT"} columns.`);
    }
    entry.columns[component.component] = component.columnIndex;
  }

  const subjects = [...columnsBySubject.values()].map(({ sourceName, columns }) => ({
    sourceName,
    theoryColumn: columns.theory,
    practicalColumn: columns.practical,
  }));
  if (!subjects.length) throw new Error("No subject mark columns were found.");

  const parsedRows = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    if (!row.some((cell) => String(cell ?? "").trim())) continue;
    const rollNo = String(row[rollColumn] ?? "").trim();
    const name = String(row[nameColumn] ?? "").trim();
    const regNo = regColumn >= 0 ? String(row[regColumn] ?? "").trim() : "";
    const hasMarks = subjects.some((subject) =>
      String(row[subject.theoryColumn] ?? "").trim() || String(row[subject.practicalColumn] ?? "").trim()
    );
    if (!rollNo && !name && !hasMarks) continue;
    // Summary lines such as "Avg.Value" sit under the roster and are not students.
    const rowLabel = `${rollNo}${name}`.toLowerCase().replace(/[^a-z]/g, "");
    if (/^(total|average|percentage|rank|avgvalue|avgval)/.test(rowLabel)) continue;

    const marks = {};
    const errors = [];
    for (const subject of subjects) {
      if (subject.theoryColumn === undefined || subject.practicalColumn === undefined) {
        errors.push(`${subject.sourceName} must have both TH and INT columns.`);
        continue;
      }
      const theory = parseMark(row[subject.theoryColumn]);
      const practical = parseMark(row[subject.practicalColumn]);
      if (theory === null || practical === null) {
        errors.push(`${subject.sourceName} is missing a TH or INT mark.`);
      } else if (!Number.isFinite(theory) || !Number.isFinite(practical)) {
        errors.push(`${subject.sourceName} has a non-numeric mark.`);
      } else {
        marks[subject.sourceName] = { theory, practical };
      }
    }

    parsedRows.push({ rowNumber: rowIndex + 1, rollNo, regNo, name, marks, errors });
  }

  if (!parsedRows.length) throw new Error("No student mark rows were found below the header.");
  return { subjects: subjects.map(({ sourceName }) => sourceName), rows: parsedRows };
};
