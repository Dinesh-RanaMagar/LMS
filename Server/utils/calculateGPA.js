export const getGradePoint = (percentage = 0) => {
  const value = Number(percentage || 0);

  if (value >= 90) return 4.0;
  if (value >= 80) return 3.6;
  if (value >= 70) return 3.2;
  if (value >= 60) return 2.8;
  if (value >= 50) return 2.4;
  if (value >= 40) return 2.0;
  if (value >= 35) return 1.6;
  return 0.0;
};

export const getGrade = (percentage = 0) => {
  const value = Number(percentage || 0);

  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 70) return "B+";
  if (value >= 60) return "B";
  if (value >= 50) return "C+";
  if (value >= 40) return "C";
  if (value >= 35) return "D";
  return "NG";
};

// Theory and practical each carry their own credit hour. A subject's grade point
// contribution is the sum of both components weighted by their own credit hour,
// so a 3 CH theory + 1 CH practical subject is weighted 3:1.
export const calculateCreditHourGPA = (marks = []) => {
  let totalMarks = 0;
  let totalFullMarks = 0;
  let totalCreditHour = 0;
  let totalWeightedGradePoints = 0;
  let hasFailedSubject = false;

  const calculatedMarks = marks.map((mark) => {
    const theory = Number(mark.theory || 0);
    const practical = Number(mark.practical || 0);
    const fullMarks = Number(mark.fullMarks || 0);
    const passMarks = Number(mark.passMarks || 0);
    const creditHour = Number(mark.creditHour || 0);
    const obtainedMarks = theory + practical;
    const percentage = fullMarks ? (obtainedMarks / fullMarks) * 100 : 0;
    const grade = getGrade(percentage);
    const gradePoint = getGradePoint(percentage);
    const hasPractical = Boolean(mark.hasPractical);
    const theoryPassMarks = Number(mark.theoryPassMarks || 0);
    const practicalPassMarks = Number(mark.practicalPassMarks || 0);
    const theoryFullMarks = Number(mark.theoryFullMarks || 0);
    const practicalFullMarks = Number(mark.practicalFullMarks || 0);

    // Practical credit hour only counts when the subject actually has a practical.
    const practicalCreditHour = hasPractical ? Number(mark.practicalCreditHour || 0) : 0;
    const theoryPercentage = theoryFullMarks ? (theory / theoryFullMarks) * 100 : 0;
    const practicalPercentage = practicalFullMarks ? (practical / practicalFullMarks) * 100 : 0;
    const theoryGradePoint = getGradePoint(theoryPercentage);
    const practicalGradePoint = getGradePoint(practicalPercentage);
    const subjectCreditHour = creditHour + practicalCreditHour;
    const weightedGradePoints = hasPractical
      ? theoryGradePoint * creditHour + practicalGradePoint * practicalCreditHour
      : gradePoint * creditHour;

    const result = hasPractical
      ? theory >= theoryPassMarks && practical >= practicalPassMarks ? "Pass" : "Fail"
      : obtainedMarks >= passMarks ? "Pass" : "Fail";

    totalMarks += obtainedMarks;
    totalFullMarks += fullMarks;

    if (subjectCreditHour > 0) {
      totalCreditHour += subjectCreditHour;
      totalWeightedGradePoints += weightedGradePoints;
    }

    if (result === "Fail") {
      hasFailedSubject = true;
    }

    return {
      ...mark,
      theory,
      practical,
      fullMarks,
      passMarks,
      hasPractical,
      theoryFullMarks,
      theoryPassMarks,
      practicalFullMarks,
      practicalPassMarks,
      creditHour,
      practicalCreditHour,
      obtainedMarks,
      percentage,
      grade: result === "Fail" ? "NG" : grade,
      gradePoint,
      result,
    };
  });

  const percentage = totalFullMarks ? (totalMarks / totalFullMarks) * 100 : 0;
  // If no credit hours are assigned, derive GPA from overall percentage instead of returning 0
  const gpa = totalCreditHour
    ? Number((totalWeightedGradePoints / totalCreditHour).toFixed(2))
    : Number(getGradePoint(percentage).toFixed(2));
  const grade = hasFailedSubject ? "NG" : getGrade(percentage);
  const result = hasFailedSubject ? "Fail" : "Pass";

  return {
    marks: calculatedMarks,
    totalMarks,
    totalFullMarks,
    totalCreditHour,
    totalWeightedGradePoints,
    percentage,
    gpa,
    grade,
    result,
  };
};
