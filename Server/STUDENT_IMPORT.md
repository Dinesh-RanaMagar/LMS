`   -#-f* Student data import and migration

## Back up first

Before migrating real school data, create and verify a MongoDB backup or Atlas snapshot. With MongoDB Database Tools installed and `MONGODB_URI` set in PowerShell, save a timestamped backup outside the repository:

```powershell
$backupPath = Join-Path $HOME ("lms-backups\before-student-import-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path (Split-Path $backupPath) -Force | Out-Null
mongodump --uri="$env:MONGODB_URI" --out="$backupPath"
```

Keep the backup outside source control. Do not use the demo seeder against a live database; it clears the selected database.

## Import workflow

1. Start the backend and sign in with an administrator account.
2. Open **Students → Bulk Registration (CSV / Excel)**. The download button provides `student_registration_template.xls` with the exact legacy column headings. Fill the columns you have; the uploader also accepts `.xlsx` and `.csv` (up to 10 MB and 10,000 student rows).
3. Review the automatic field matches. Old columns that do not apply, including the legacy `Id`, can remain unmapped.
4. Choose BS or AD for an ambiguous date column. AD dates are stored in the existing `dob` field. BS dates are preserved as their original text in `dobBs`; the importer does not convert them. The student form exposes both values.
5. Map each old class name to an active class configured in the website, review sections and the preview, and explicitly confirm the mappings.
6. Review rows flagged as possible matches. They are imported only after individual approval. Exact identifier/roll duplicates and invalid rows are skipped.
7. Download the CSV report to review skipped or failed rows.

The importer adds students and yearly enrollment records to the existing collections. It never updates or deletes existing students. `Regd.No.` is stored in the existing `emisCode` field; legacy `Id` values are preserved as `legacyDetails.legacyId` and never treated as MongoDB IDs. Combined values such as `EIGHT-A` in `Class/Sec.` are split into the class and section, then mapped to configured classes. Parent contacts, board registration numbers, admission dates, and the other recognized school-specific fields are retained in the student's `legacyDetails` map.

Configure target classes and sections before starting. Sections are checked against the selected class when that class has configured sections. If the file contains an academic-year column, each year must already exist. If there is no academic-year column, the importer assigns the current active academic year and shows this in the preview.

## Tests

Run backend tests and lint:

```powershell
cd Server
npm test
npm run lint
```

Tests cover both supported header layouts, CSV and workbook parsing, mapping, date handling, duplicate checks, and imports through mocked database models. Before production, run a preview and a small import using a backed-up test database and representative copies of the source workbooks.
