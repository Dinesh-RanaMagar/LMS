import xlsx from "xlsx";

export const IMPORT_FIELDS = [
  { key: "legacyId", label: "Legacy source ID (stored as text only)" },
  { key: "name", label: "Student name" },
  { key: "className", label: "Class" },
  { key: "section", label: "Section" },
  { key: "classSection", label: "Combined class / section" },
  { key: "rollNo", label: "Roll number" },
  { key: "registrationNo", label: "Registration number" },
  { key: "symbolNo", label: "Symbol number" },
  { key: "boardRegdNo", label: "Board registration number" },
  { key: "dob", label: "Date of birth (AD)" },
  { key: "dobBs", label: "Date of birth (BS)" },
  { key: "gender", label: "Gender" },
  { key: "fatherName", label: "Father's name" },
  { key: "fatherContactNo", label: "Father's contact number" },
  { key: "fatherOccupation", label: "Father's occupation" },
  { key: "fatherEmail", label: "Father's email" },
  { key: "motherName", label: "Mother's name" },
  { key: "motherContactNo", label: "Mother's contact number" },
  { key: "motherOccupation", label: "Mother's occupation" },
  { key: "motherEmail", label: "Mother's email" },
  { key: "guardianName", label: "Guardian name" },
  { key: "guardianContactNo", label: "Guardian's contact number" },
  { key: "guardianOccupation", label: "Guardian's occupation" },
  { key: "guardianEmail", label: "Guardian's email" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Student email" },
  { key: "address", label: "Address" },
  { key: "currentAddress", label: "Current address" },
  { key: "province", label: "Province / state" },
  { key: "district", label: "District" },
  { key: "localLevel", label: "Local level" },
  { key: "village", label: "Village" },
  { key: "admissionDateBs", label: "Admission date (BS)" },
  { key: "admissionDateAd", label: "Admission date (AD)" },
  { key: "cardNo", label: "Card number" },
  { key: "enrollNo", label: "Enrollment number" },
  { key: "caste", label: "Caste" },
  { key: "houseName", label: "House name" },
  { key: "medium", label: "Medium" },
  { key: "studentType", label: "Student type" },
  { key: "ageRange", label: "Age range" },
  { key: "ledgerPanaNo", label: "Ledger page number" },
  { key: "iemisCode", label: "IEMIS code" },
  { key: "isNew", label: "New student" },
  { key: "citizenshipNo", label: "Citizenship number" },
  { key: "motherTongue", label: "Mother tongue" },
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "physicalDisability", label: "Physical disability" },
  { key: "aim", label: "Student's aim" },
  { key: "birthCertificateNo", label: "Birth certificate number" },
  { key: "remarks", label: "Remarks" },
  { key: "bloodGroup", label: "Blood group" },
  { key: "school", label: "School" },
  { key: "ageDetails", label: "Age details" },
  { key: "academicYear", label: "Academic year" },
];

export const LEGACY_ROSTER_TEMPLATE_HEADERS = [
  "Id",
  "Regd.No.",
  "BoardRegdNo",
  "Name",
  "Gender",
  "Roll No.",
  "Class/Sec.",
  "DOB(B.S.)",
  "DOB(A.D.)",
  "Contact No.",
  "Email Id",
  "Father's Name",
  "Father's ContactNo",
  "Mother's Name",
  "Mother's ContactNo",
  "GuardianName",
  "G_ContacNo",
  "P.Address",
  "Current Address",
  "AdmissionDate(B.S.)",
  "AdmissionDate(A.D.)",
  "Card No",
  "Enroll No.",
  "Caste",
  "House Name",
  "Medium",
  "Student Type",
  "Age Range",
  "Ledger PanaNo",
  "IEMIS Code",
  "Is New",
  "Father Occupation",
  "Guardian Occupation",
  "Mother Occupation",
  "Citizenship No",
  "Mother Tongue",
  "Height",
  "Weight",
  "Physical Disability",
  "Aim",
  "Birth Certificate No",
  "Remarks",
  "Province/State",
  "District",
  "LocalLevel",
  "Village",
  "F_Email",
  "M_Email",
  "G_Email",
  "Class",
  "Section",
  "Blood Group",
  "School",
];

export const LEGACY_DETAIL_FIELDS = [
  "legacyId", "boardRegdNo", "email",
  "fatherContactNo", "fatherOccupation", "fatherEmail",
  "motherContactNo", "motherOccupation", "motherEmail",
  "guardianName", "guardianContactNo", "guardianOccupation", "guardianEmail",
  "currentAddress", "province", "district", "localLevel", "village",
  "admissionDateBs", "admissionDateAd", "cardNo", "enrollNo",
  "caste", "houseName", "medium", "studentType", "ageRange",
  "ledgerPanaNo", "iemisCode", "isNew", "citizenshipNo", "motherTongue",
  "height", "weight", "physicalDisability", "aim", "birthCertificateNo",
  "remarks", "bloodGroup", "school", "ageDetails",
];

const aliases = new Map([
  ["id", "legacyId"],
  ["name", "name"], ["studentname", "name"], ["fullname", "name"],
  ["classname", "className"], ["class", "className"], ["grade", "className"],
  ["section", "section"], ["classsection", "section"],
  ["classsec", "classSection"], ["classsectionname", "classSection"],
  ["rollno", "rollNo"], ["rollnumber", "rollNo"],
  ["registrationno", "registrationNo"], ["regno", "registrationNo"], ["regdno", "registrationNo"],
  ["registrationnumber", "registrationNo"], ["redgno", "registrationNo"],
  ["symbolno", "symbolNo"], ["symbolnumber", "symbolNo"],
  ["boardregdno", "boardRegdNo"], ["boardregistrationno", "boardRegdNo"],
  ["dob", "dob"], ["dateofbirth", "dob"], ["dobad", "dob"],
  ["dateofbirthad", "dob"], ["dateofbirthgregorian", "dob"],
  ["dobbs", "dobBs"], ["dateofbirthbs", "dobBs"],
  ["gender", "gender"],
  ["fathername", "fatherName"], ["fathersname", "fatherName"],
  ["fathercontactno", "fatherContactNo"], ["fatherscontactno", "fatherContactNo"],
  ["fathercontactnumber", "fatherContactNo"], ["fatherscontactnumber", "fatherContactNo"],
  ["fatheroccupation", "fatherOccupation"], ["femail", "fatherEmail"], ["fatheremail", "fatherEmail"],
  ["mothername", "motherName"], ["mothersname", "motherName"],
  ["mothercontactno", "motherContactNo"], ["motherscontactno", "motherContactNo"],
  ["mothercontactnumber", "motherContactNo"], ["motherscontactnumber", "motherContactNo"],
  ["motheroccupation", "motherOccupation"], ["memail", "motherEmail"], ["motheremail", "motherEmail"],
  ["guardianname", "guardianName"], ["guardiancontactno", "guardianContactNo"],
  ["guardiancontactnumber", "guardianContactNo"], ["gcontactno", "guardianContactNo"],
  ["gcontacno", "guardianContactNo"],
  ["guardianoccupation", "guardianOccupation"], ["gemail", "guardianEmail"],
  ["guardianemail", "guardianEmail"],
  ["phone", "phone"], ["contactno", "phone"], ["contactnumber", "phone"],
  ["mobile", "phone"], ["mobilenumber", "phone"], ["email", "email"], ["emailid", "email"],
  ["address", "address"], ["permanentaddress", "address"], ["paddress", "address"],
  ["currentaddress", "currentAddress"],
  ["admissiondatebs", "admissionDateBs"], ["admissiondatead", "admissionDateAd"],
  ["cardno", "cardNo"], ["enrollno", "enrollNo"], ["enrollmentno", "enrollNo"],
  ["caste", "caste"], ["housename", "houseName"], ["medium", "medium"],
  ["studenttype", "studentType"], ["agerange", "ageRange"], ["ledgerpanano", "ledgerPanaNo"],
  ["iemiscode", "iemisCode"], ["isnew", "isNew"],
  ["fatheroccupation", "fatherOccupation"], ["guardianoccupation", "guardianOccupation"],
  ["motheroccupation", "motherOccupation"], ["citizenshipno", "citizenshipNo"],
  ["mothertongue", "motherTongue"], ["height", "height"], ["weight", "weight"],
  ["physicaldisability", "physicalDisability"], ["aim", "aim"],
  ["birthcertificateno", "birthCertificateNo"], ["remarks", "remarks"],
  ["province", "province"], ["provincestate", "province"], ["district", "district"],
  ["locallevel", "localLevel"], ["village", "village"],
  ["bloodgroup", "bloodGroup"], ["school", "school"], ["agedet", "ageDetails"],
  ["agedetails", "ageDetails"],
  ["academicyear", "academicYear"], ["year", "academicYear"],
]);

export const normalizeHeader = (header) => String(header ?? "")
  .toLowerCase()
  .replace(/\(bs\)|\bbs\b/g, "bs")
  .replace(/\(ad\)|\bad\b/g, "ad")
  .replace(/[^a-z0-9]/g, "");

export const getDateFormatFromHeader = (header) => {
  const normalized = normalizeHeader(header);
  if (normalized.endsWith("bs")) return "BS";
  if (normalized.endsWith("ad")) return "AD";
  return "";
};

export const getAutomaticMapping = (headers) => {
  const mapping = {};
  const mappedFields = new Set();
  for (const header of headers) {
    const field = aliases.get(normalizeHeader(header));
    if (field && !mappedFields.has(field)) {
      mapping[header] = field;
      mappedFields.add(field);
    } else {
      mapping[header] = "";
    }
  }
  return mapping;
};

export const parseStudentWorkbook = (buffer) => {
  const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("The uploaded file does not contain a worksheet");
  const worksheet = workbook.Sheets[firstSheetName];
  const rawMatrix = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: true,
  });
  const displayMatrix = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });
  const matrix = rawMatrix.map((row, rowIndex) => row.map((value, columnIndex) => {
    const displayedValue = displayMatrix[rowIndex]?.[columnIndex];
    if (value instanceof Date) {
      const normalizedHeader = normalizeHeader(rawMatrix[0]?.[columnIndex]);
      const isBirthDate = normalizedHeader.startsWith("dob")
        || normalizedHeader.startsWith("dateofbirth");
      const isAdBirthDate = getDateFormatFromHeader(rawMatrix[0]?.[columnIndex]) === "AD";
      if (rowIndex > 0 && isBirthDate && (isAdBirthDate || !getDateFormatFromHeader(rawMatrix[0]?.[columnIndex]))) {
        return value;
      }
      return displayedValue;
    }
    return displayedValue;
  }));
  if (!matrix.length || !matrix[0].some((value) => String(value ?? "").trim())) {
    throw new Error("The first worksheet must contain a header row");
  }

  const headers = [];
  const usedHeaders = new Set();
  matrix[0].forEach((value, index) => {
    const base = String(value ?? "").trim() || `Column ${index + 1}`;
    let header = base;
    let suffix = 2;
    while (usedHeaders.has(header)) {
      header = `${base} (#${suffix})`;
      suffix += 1;
    }
    usedHeaders.add(header);
    headers.push(header);
  });

  const rows = [];
  let blankRows = 0;
  for (const [index, values] of matrix.slice(1).entries()) {
    const record = {};
    const displayRecord = {};
    headers.forEach((header, column) => {
      record[header] = values[column] ?? "";
      displayRecord[header] = displayMatrix[index + 1]?.[column] ?? "";
    });
    if (Object.values(record).every((value) => String(value ?? "").trim() === "")) {
      blankRows += 1;
      continue;
    }
    rows.push({ rowNumber: index + 2, values: record, displayValues: displayRecord });
  }
  if (!rows.length) throw new Error("The worksheet contains no student data rows");
  if (rows.length > 10000) throw new Error("The file exceeds the 10,000-row import limit");

  return { headers, rows, totalRows: matrix.length - 1, blankRows };
};

const validCalendarDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? date
    : null;
};

export const parseAdDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { date: value, error: "" };
  }
  const text = String(value ?? "").trim();
  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const date = validCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
    return date ? { date, error: "" } : { date: null, error: "Invalid AD date" };
  }

  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!match) return { date: null, error: "Use an explicit AD date such as YYYY-MM-DD" };
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (first <= 12 && second <= 12) {
    return { date: null, error: "Ambiguous AD date; use YYYY-MM-DD" };
  }
  const month = first > 12 ? second : first;
  const day = first > 12 ? first : second;
  const date = validCalendarDate(Number(match[3]), month, day);
  return date ? { date, error: "" } : { date: null, error: "Invalid AD date" };
};

export const validateBsDate = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return Number(match[2]) >= 1 && Number(match[2]) <= 12
      && Number(match[3]) >= 1 && Number(match[3]) <= 32
      ? ""
      : "Use a BS date such as YYYY-MM-DD or M/D/YY";
  }
  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12 || Number(match[2]) < 1 || Number(match[2]) > 32) {
    return "Use a BS date such as YYYY-MM-DD; the original BS value is preserved without conversion";
  }
  return "";
};

export const suggestClassName = (sourceName, configuredNames) => {
  const source = String(sourceName ?? "").trim().toLowerCase();
  const exact = configuredNames.find((name) => name.toLowerCase() === source);
  if (exact) return exact;

  const numberWords = {
    nursery: "nursery", lkg: "lkg", ukg: "ukg",
    one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
    eleven: "11", twelve: "12",
  };
  const getGradeNumber = (name) => {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const word = numberWords[normalized];
    if (word) return word;
    const number = normalized.match(/\d+/)?.[0];
    return number || normalized;
  };
  const sourceNumber = getGradeNumber(source);
  const matches = configuredNames.filter((name) => getGradeNumber(name) === sourceNumber);
  return matches.length === 1 ? matches[0] : "";
};
