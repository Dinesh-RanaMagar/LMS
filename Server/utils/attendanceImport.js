import xlsx from "xlsx";

const normalizeHeader = (value) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "");

const normalizeName = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const normalizeRollNumber = (value) => {
  const roll = String(value ?? "").trim();
  return /^\d+(?:\.0+)?$/.test(roll) ? String(Number(roll)) : roll.toLowerCase();
};

const validateSchoolDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

export const getInclusiveDateRangeDays = (fromDate, toDate) => {
  if (!validateSchoolDate(fromDate) || !validateSchoolDate(toDate) || fromDate > toDate) return 0;
  const [fromYear, fromMonth, fromDay] = fromDate.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDate.split("-").map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.floor((end - start) / 86400000) + 1;
};

export const parseAttendanceWorkbook = (buffer) => {
  let workbook;
  try {
    workbook = xlsx.read(buffer, { type: "buffer", cellDates: false });
  } catch {
    throw new Error("The spreadsheet could not be read. Upload a valid Excel file.");
  }
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("The workbook does not contain a worksheet.");
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    header: 1,
    defval: "",
    raw: true,
  });
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return headers.some((header) => ["rn", "rollno", "rollnumber"].includes(header))
      && headers.some((header) => ["name", "studentname"].includes(header))
      && headers.some((header) => ["att", "attendance", "presentdays"].includes(header));
  });
  if (headerIndex < 0) throw new Error("The Excel header must include R.N., Name, and Att. columns.");

  const headers = rows[headerIndex].map(normalizeHeader);
  const rollIndex = headers.findIndex((header) => ["rn", "rollno", "rollnumber"].includes(header));
  const nameIndex = headers.findIndex((header) => ["name", "studentname"].includes(header));
  const attendanceIndex = headers.findIndex((header) => ["att", "attendance", "presentdays"].includes(header));
  const parsedRows = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    if (row.every((value) => String(value ?? "").trim() === "")) continue;
    const rollNo = normalizeRollNumber(row[rollIndex]);
    const name = normalizeName(row[nameIndex]);
    const rawAttendance = String(row[attendanceIndex] ?? "").trim();
    const attendanceMatch = rawAttendance.match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
    const presentDays = attendanceMatch ? Number(attendanceMatch[1]) : Number.NaN;
    const reportedWorkingDays = attendanceMatch?.[2] ? Number(attendanceMatch[2]) : null;
    const errors = [];
    if (!rollNo) errors.push(`Row ${rowIndex + 1}: roll number is required.`);
    if (!name) errors.push(`Row ${rowIndex + 1}: student name is required.`);
    if (!Number.isInteger(presentDays) || presentDays < 0) {
      errors.push(`Row ${rowIndex + 1}: Att. must be present days (for example 92) or present/working days (for example 92/92).`);
    }
    if (reportedWorkingDays !== null && (!Number.isInteger(reportedWorkingDays) || reportedWorkingDays < 1)) {
      errors.push(`Row ${rowIndex + 1}: the working-day total in Att. must be a positive whole number.`);
    }
    parsedRows.push({ rowNumber: rowIndex + 1, rollNo, name, presentDays, reportedWorkingDays, errors });
  }
  if (!parsedRows.length) throw new Error("No attendance rows were found below the header.");
  return parsedRows;
};

export const resolveAttendanceWorkingDays = (parsedRows, workingDays) => {
  if (workingDays !== undefined && workingDays !== null && workingDays !== "") {
    return Number(workingDays);
  }
  if (!parsedRows.length || parsedRows.some((row) => row.reportedWorkingDays === null)) return null;
  const [firstWorkingDays] = parsedRows;
  return parsedRows.every((row) => row.reportedWorkingDays === firstWorkingDays.reportedWorkingDays)
    ? firstWorkingDays.reportedWorkingDays
    : null;
};

export const normalizeAttendanceName = normalizeName;
export const normalizeAttendanceRoll = normalizeRollNumber;
