import test from "node:test";
import assert from "node:assert/strict";
import { mapAssignedSubjectsToExam } from "../utils/examSubjects.js";

test("maps only the subjects assigned to a class into its exam config", () => {
  const classAssignments = {
    "Class 9": [
      { subjectName: "English", fullMarks: 100, passMarks: 40 },
      {
        subjectName: "Science",
        fullMarks: 100,
        passMarks: 40,
        theoryFullMarks: 75,
        practicalFullMarks: 25,
        hasPractical: true,
        creditHour: 4,
      },
    ],
    "Class 10": [
      { subjectName: "Mathematics", fullMarks: 100, passMarks: 40 },
    ],
  };

  const classNineSubjects = mapAssignedSubjectsToExam(classAssignments["Class 9"]);
  const classTenSubjects = mapAssignedSubjectsToExam(classAssignments["Class 10"]);

  assert.deepEqual(classNineSubjects.map((subject) => subject.subjectName), ["English", "Science"]);
  assert.deepEqual(classTenSubjects.map((subject) => subject.subjectName), ["Mathematics"]);
  assert.equal(classNineSubjects[1].theoryFullMarks, 75);
  assert.equal(classNineSubjects[1].practicalFullMarks, 25);
  assert.equal(classNineSubjects[1].creditHour, 4);
});

test("ignores malformed class-subject rows without a subject name", () => {
  assert.deepEqual(mapAssignedSubjectsToExam([
    { subject: "orphaned subject id", fullMarks: 100 },
    { subjectName: "  Mathematics ", fullMarks: 100, passMarks: 40 },
  ]).map((subject) => subject.subjectName), ["Mathematics"]);
});
