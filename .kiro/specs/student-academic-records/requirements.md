# Requirements Document

## Introduction

This feature redesigns the student promotion system in the school management application (Node.js/Express + MongoDB). Currently, the system mutates the student document in-place whenever a student is promoted — overwriting `className`, `section`, `rollNo`, and `academicYear` directly on the student record — which destroys enrollment history and makes it impossible to correctly filter students by academic year.

The redesign introduces a separate `StudentAcademicRecord` collection. Each document in that collection represents one student's enrollment in one academic year and class. The `Student` document becomes a permanent identity record (one per student, never duplicated or mutated on promotion). All year-aware queries (student lists, attendance, marksheets, promotion eligibility) are routed through `StudentAcademicRecord` instead of through the student document itself.

---

## Glossary

- **Student**: A permanent identity document in the `students` collection. Contains immutable personal information (name, date of birth, guardian details, codes). Created once on admission; never duplicated.
- **AcademicRecord**: A document in the `studentAcademicRecords` collection that links a Student to a specific AcademicYear and Class. Holds year-specific enrollment data: `classId`, `academicYearId`, `section`, `rollNo`, `status`.
- **AcademicYear**: A document in the `academicYears` collection representing one school year (e.g., "2081", "2082"). Has an `isActive` flag; exactly one is active at any time.
- **Class**: A document in the `classes` collection representing a grade level (e.g., "Class 8"). Has an `order` field used to determine promotion targets.
- **Promotion**: The act of creating a new AcademicRecord for the next AcademicYear (and next Class if the student passed) without modifying or duplicating the Student document.
- **Retention**: A variant of promotion where the student is assigned a new AcademicRecord for the next AcademicYear but stays in the same Class.
- **PromotionService**: The server-side module responsible for promotion business logic.
- **StudentController**: The Express controller handling student CRUD and list endpoints.
- **AcademicRecordController**: The Express controller handling CRUD and query operations on AcademicRecords.
- **Final Exam**: An exam document where `isFinalExam: true` and `isResultPublished: true`, used to determine promotion eligibility.
- **Marksheet**: A document linking a Student to an Exam with grade, GPA, and pass/fail result.

---

## Requirements

### Requirement 1: Single Student Identity Record

**User Story:** As a school administrator, I want each student to have exactly one permanent record in the system, so that personal information is never duplicated or lost during the promotion process.

#### Acceptance Criteria

1. THE Student document SHALL contain only personal identity fields: `name`, `dob`, `gender`, `fatherName`, `motherName`, `guardianName`, `mobileNumber`, `phone`, `address`, `emisCode`, `studentCode`, `symbolNo`, `status`, `createdAt`, `updatedAt`.
2. THE Student document SHALL NOT contain `className`, `section`, `rollNo`, `academicYear`, `isPromoted`, `promotedTo`, or `promotionDate` fields.
3. WHEN a student is admitted, THE StudentController SHALL create exactly one Student document and exactly one AcademicRecord document.
4. WHEN a student is promoted or retained, THE PromotionService SHALL NOT create an additional Student document.
5. THE `students` collection SHALL enforce a unique index on `studentCode`.

---

### Requirement 2: StudentAcademicRecord Collection

**User Story:** As a school administrator, I want each student's enrollment in each academic year to be stored as a separate record, so that historical enrollment data is preserved and year-based filtering works correctly.

#### Acceptance Criteria

1. THE AcademicRecord document SHALL contain the fields: `_id`, `studentId` (ObjectId ref `Student`), `academicYearId` (ObjectId ref `AcademicYear`), `classId` (ObjectId ref `Class`), `section` (String, optional), `rollNo` (Number, optional), `status` (`"active"` | `"promoted"` | `"retained"` | `"left"`), `createdAt`, `updatedAt`.
2. THE `studentAcademicRecords` collection SHALL enforce a unique compound index on `{ studentId, academicYearId }` to prevent duplicate enrollments for the same student in the same academic year.
3. WHEN a student is admitted, THE AcademicRecordController SHALL create an AcademicRecord with `status: "active"` for the currently active AcademicYear.
4. WHEN querying students for a specific academic year and class, THE AcademicRecordController SHALL return only students whose AcademicRecord matches both the requested `academicYearId` and `classId`.
5. THE AcademicRecord document SHALL be populated with the referenced Student, AcademicYear, and Class documents when returned from query endpoints.

---

### Requirement 3: Academic Year Filtering Correctness

**User Story:** As a school administrator, I want student lists to show only students enrolled in the selected academic year and class, so that I never see 2025-admitted students appear in a 2024 class list or vice versa.

#### Acceptance Criteria

1. WHEN a request is made to list students with an `academicYearId` parameter, THE AcademicRecordController SHALL return only AcademicRecords whose `academicYearId` matches the requested value.
2. WHEN a request is made to list students with a `classId` parameter, THE AcademicRecordController SHALL return only AcademicRecords whose `classId` matches the requested value.
3. WHEN a student has an AcademicRecord only for academic year 2025, THE AcademicRecordController SHALL NOT return that student in response to a query for academic year 2024.
4. WHEN a student has been promoted and has an AcademicRecord for academic year 2026, THE AcademicRecordController SHALL return that student in response to a query for academic year 2026.
5. IF neither `academicYearId` nor `academicYear` (yearName) is supplied in the request, THE AcademicRecordController SHALL default to filtering by the currently active AcademicYear.

---

### Requirement 4: Promotion Without Student Duplication

**User Story:** As a school administrator, I want to promote multiple students at once, so that they are correctly placed in the next academic year and class without corrupting existing records.

#### Acceptance Criteria

1. WHEN the promotion endpoint receives an array of `studentIds` and a `toAcademicYearId`, THE PromotionService SHALL create one new AcademicRecord per student for the target AcademicYear.
2. WHEN a student passed the Final Exam, THE PromotionService SHALL set the new AcademicRecord's `classId` to the next higher-ranked Class.
3. WHEN a student failed the Final Exam, THE PromotionService SHALL set the new AcademicRecord's `classId` to the same Class as the student's current AcademicRecord.
4. WHEN the promotion endpoint is called for a student who already has an AcademicRecord for the target AcademicYear, THE PromotionService SHALL reject that student's promotion with an error message and SHALL NOT create a duplicate AcademicRecord.
5. AFTER promotion, THE PromotionService SHALL update the student's previous AcademicRecord `status` to `"promoted"` (or `"retained"` if the student failed).
6. THE PromotionService SHALL NOT modify any field on the Student document during the promotion process.

---

### Requirement 5: Promotion Eligibility Check

**User Story:** As a school administrator, I want to see a list of students eligible for promotion, so that I can select and promote them individually or in bulk.

#### Acceptance Criteria

1. WHEN the promotion eligibility endpoint is called, THE PromotionService SHALL return students who have a published Final Exam Marksheet for the active AcademicYear and do NOT yet have an AcademicRecord for a future AcademicYear.
2. THE PromotionService SHALL include in each eligibility result: the Student document, the current Class name, the target Class name (next class if passed, same class if failed), the exam name, grade, GPA, and pass/fail result.
3. IF no published Final Exam exists for the active AcademicYear, THE PromotionService SHALL return a 404 response with a descriptive error message.
4. WHEN the eligibility endpoint is called, THE PromotionService SHALL NOT return a student who has already been promoted to any future AcademicYear.

---

### Requirement 6: Student Admission with Academic Record

**User Story:** As a school administrator, I want admitting a new student to automatically create their first enrollment record, so that the student immediately appears in the correct class list for the active academic year.

#### Acceptance Criteria

1. WHEN a new student admission request is received, THE StudentController SHALL validate that `name`, `classId`, and `section` are present.
2. WHEN a new student admission request is received, THE StudentController SHALL resolve the active AcademicYear and create both a Student document and an AcademicRecord document in a single operation.
3. IF a rollNo is provided and another AcademicRecord already has that rollNo in the same `classId`, `section`, and `academicYearId`, THE StudentController SHALL reject the request with an error message indicating the duplicate roll number.
4. WHEN admission succeeds, THE StudentController SHALL return the created Student document and the created AcademicRecord document in the response.
5. IF no active AcademicYear exists at the time of admission, THE StudentController SHALL return a 400 error with a message instructing the administrator to set an active academic year.

---

### Requirement 7: Student List Pages Load via Academic Records

**User Story:** As a school administrator, I want the Students page to load students through their academic records, so that the displayed list always reflects the selected academic year and class accurately.

#### Acceptance Criteria

1. THE Students page SHALL send the selected `academicYear` (yearName) and optionally `className` as query parameters to the student list endpoint.
2. WHEN the student list endpoint receives a request, THE AcademicRecordController SHALL join AcademicRecord documents with the referenced Student, AcademicYear, and Class documents and return the combined data.
3. THE Students page SHALL display `className`, `section`, and `rollNo` from the AcademicRecord, not from the Student document.
4. WHEN the selected academic year is changed on the Students page, THE Students page SHALL re-fetch from the student list endpoint with the new academic year parameter, and the displayed list SHALL update to reflect only students enrolled in that year.
5. THE student list endpoint SHALL support filtering by `className` so that the Students page can display a class-specific roster.

---

### Requirement 8: Prevent Duplicate Promotions

**User Story:** As a school administrator, I want the system to block promoting a student who is already enrolled in the target academic year, so that the database remains consistent and free of duplicate enrollments.

#### Acceptance Criteria

1. WHEN the promotion endpoint is called, THE PromotionService SHALL check for an existing AcademicRecord with matching `studentId` and `toAcademicYearId` before creating a new one.
2. IF an AcademicRecord already exists for the `studentId` and `toAcademicYearId`, THE PromotionService SHALL skip that student, add their name to an errors array in the response, and continue processing remaining students.
3. WHEN the bulk promotion endpoint finishes processing, THE PromotionService SHALL return a response containing a `promoted` array of successful promotions and an `errors` array of skipped students with reasons.
4. THE `studentAcademicRecords` collection unique index on `{ studentId, academicYearId }` SHALL serve as a database-level enforcement of the no-duplicate-promotion rule, so that even concurrent requests cannot create duplicate records.

---

### Requirement 9: Preserve and Expose Promotion History

**User Story:** As a school administrator, I want to view a student's complete academic history across all years, so that I can track their progress and verify past enrollments.

#### Acceptance Criteria

1. WHEN a request is made for a student's academic history by `studentId`, THE AcademicRecordController SHALL return all AcademicRecords for that student sorted by AcademicYear in ascending order.
2. THE returned AcademicRecord history SHALL include the populated AcademicYear name, Class name, section, rollNo, and status for each record.
3. WHEN a promotion is completed, THE PromotionService SHALL retain all previous AcademicRecords unchanged so that the full history remains queryable.

---

### Requirement 10: Validation Rules

**User Story:** As a school administrator, I want the API to reject invalid requests with clear error messages, so that data integrity is maintained automatically.

#### Acceptance Criteria

1. WHEN a request body is missing a required field (`studentId`, `toAcademicYearId`, `classId`, `name`, or `section`), THE API SHALL return a 400 response with a message identifying the missing field.
2. WHEN a `studentId`, `academicYearId`, or `classId` value does not correspond to an existing document, THE API SHALL return a 404 response with a descriptive message.
3. WHEN a `rollNo` value is provided and is not a positive integer, THE API SHALL return a 400 response.
4. WHEN the promotion endpoint receives a `studentIds` array that is empty or not an array, THE PromotionService SHALL return a 400 response.
5. THE Student document `studentCode` and `emisCode` fields SHALL enforce uniqueness at the database level, and THE StudentController SHALL return a 409 response if a duplicate value is submitted.

---

### Requirement 11: Mongoose Models and Relationships

**User Story:** As a backend developer, I want well-defined Mongoose models with explicit references and virtual/populate paths, so that queries are straightforward and data integrity is enforced at the schema level.

#### Acceptance Criteria

1. THE `StudentAcademicRecord` Mongoose schema SHALL declare `studentId` as `{ type: ObjectId, ref: 'Student', required: true }`, `academicYearId` as `{ type: ObjectId, ref: 'AcademicYear', required: true }`, and `classId` as `{ type: ObjectId, ref: 'Class', required: true }`.
2. THE `Student` Mongoose schema SHALL declare a virtual `academicRecords` that uses a `populate`-compatible path pointing to `StudentAcademicRecord.studentId`.
3. THE `StudentAcademicRecord` Mongoose schema SHALL include the compound unique index `{ studentId: 1, academicYearId: 1 }`.
4. WHEN a Student document is deleted, THE AcademicRecordController SHALL also delete all associated AcademicRecord documents for that student.

---

### Requirement 12: Backward-Compatible API and Migration

**User Story:** As a developer, I want the new API endpoints and a data migration script to transition existing student data to the new structure, so that no historical data is lost during the upgrade.

#### Acceptance Criteria

1. THE migration script SHALL create one AcademicRecord document for every existing Student document, using the student's current `className`, `section`, `rollNo`, and `academicYear` values.
2. THE migration script SHALL resolve `className` to the corresponding `classId` from the `classes` collection, and `academicYear` (yearName) to the corresponding `academicYearId` from the `academicYears` collection.
3. IF a Class or AcademicYear matching the student's stored string value cannot be found during migration, THE migration script SHALL log a warning for that student and skip creating an AcademicRecord for them, without aborting the entire migration.
4. AFTER the migration script completes, THE script SHALL print a summary including the total number of students processed, the number of AcademicRecords created, and the number of students skipped.
5. THE new `/api/students` list endpoint SHALL accept `academicYear` (yearName string) in addition to `academicYearId` (ObjectId) as a query parameter, so that the existing frontend filter code continues to work during the transition period.
