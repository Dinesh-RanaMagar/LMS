export const getGradePoint = (percentage = 0) => {
  const value = Number(percentage || 0);

  if (value >= 90) return 4.0;
  if (value >= 80) return 3.6;
  if (value >= 70) return 3.2;
  if (value >= 60) return 2.8;
  if (value >= 50) return 2.4;
  if (value >= 40) return 2.0;
  return 0.0;
};

export const getGrade = (percentage = 0) => {
  const value = Number(percentage || 0);

  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 70) return "B+";
  if (value >= 60) return "B";
  if (value >= 50) return "C";
  if (value >= 40) return "D";
  return "F";
};

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
    const result = obtainedMarks >= passMarks ? "Pass" : "Fail";

    totalMarks += obtainedMarks;
    totalFullMarks += fullMarks;

    if (creditHour > 0) {
      totalCreditHour += creditHour;
      totalWeightedGradePoints += gradePoint * creditHour;
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
      creditHour,
      obtainedMarks,
      percentage,
      grade,
      gradePoint,
      result,
    };
  });

  const percentage = totalFullMarks ? (totalMarks / totalFullMarks) * 100 : 0;
  const gpa = totalCreditHour ? Number((totalWeightedGradePoints / totalCreditHour).toFixed(2)) : 0;
  const grade = getGrade(percentage);
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
