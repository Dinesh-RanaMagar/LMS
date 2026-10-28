import test from "node:test";
import assert from "node:assert/strict";
import { buildExamCopyData } from "../utils/examCopy.js";

test("copies exam configuration while resetting exam status and publication", () => {
  const source = {
    examName: "First Term",
    academicYear: "2083",
    examType: "regular",
    classSelectionMode: "selectedClasses",
    applicableClasses: ["Class 10"],
    classExamConfigs: [{
      className: "Class 10",
      subjectSelectionMode: "selectedSubjects",
      subjects: [{
        subjectName: "Mathematics",
        fullMarks: 100,
        passMarks: 40,
        theoryFullMarks: 75,
        theoryPassMarks: 30,
        practicalFullMarks: 25,
        practicalPassMarks: 10,
        creditHour: 4,
        hasPractical: true,
      }],
      targetStudentsMode: "selected",
      selectedStudents: ["student-id"],
    }],
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-01-10"),
    marksEntryLastDate: new Date("2026-01-12"),
    resultPublishDate: new Date("2026-01-20"),
    isFinalExam: true,
    isResultPublished: true,
    status: "completed",
    description: "Term one",
  };
  const createdBy = "admin-id";

  const copy = buildExamCopyData(source, " Second Term ", createdBy);

  assert.equal(copy.examName, "Second Term");
  assert.equal(copy.academicYear, source.academicYear);
  assert.deepEqual(copy.applicableClasses, source.applicableClasses);
  assert.deepEqual(copy.classExamConfigs, source.classExamConfigs);
  assert.equal(copy.startDate, source.startDate);
  assert.equal(copy.endDate, source.endDate);
  assert.equal(copy.marksEntryLastDate, source.marksEntryLastDate);
  assert.equal(copy.resultPublishDate, source.resultPublishDate);
  assert.equal(copy.status, "draft");
  assert.equal(copy.isFinalExam, false);
  assert.equal(copy.isResultPublished, false);
  assert.equal(copy.createdBy, createdBy);
});
