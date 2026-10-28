import test from "node:test";
import assert from "node:assert/strict";
import { calculateCreditHourGPA } from "../utils/calculateGPA.js";

test("a practical subject fails when either component is below its pass mark", () => {
  const result = calculateCreditHourGPA([{
    subject: "Science",
    theory: 29,
    practical: 20,
    fullMarks: 100,
    passMarks: 40,
    hasPractical: true,
    theoryFullMarks: 75,
    theoryPassMarks: 30,
    practicalFullMarks: 25,
    practicalPassMarks: 10,
  }]);

  assert.equal(result.marks[0].obtainedMarks, 49);
  assert.equal(result.marks[0].result, "Fail");
  assert.equal(result.result, "Fail");
});

test("a practical subject passes only when both component thresholds are met", () => {
  const result = calculateCreditHourGPA([{
    subject: "Science",
    theory: 30,
    practical: 10,
    fullMarks: 100,
    passMarks: 40,
    hasPractical: true,
    theoryFullMarks: 75,
    theoryPassMarks: 30,
    practicalFullMarks: 25,
    practicalPassMarks: 10,
  }]);

  assert.equal(result.marks[0].result, "Pass");
  assert.equal(result.result, "Pass");
});

test("subjects without a practical component keep the total pass-mark rule", () => {
  const result = calculateCreditHourGPA([{
    subject: "English",
    theory: 39,
    practical: 0,
    fullMarks: 100,
    passMarks: 40,
  }]);

  assert.equal(result.marks[0].result, "Fail");
});
