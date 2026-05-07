export const calculateSubjectGrade = (obtained, fullMarks) => {
  const percentage = (obtained / fullMarks) * 100;

  if (percentage >= 90) {
    return { grade: 'A+', gradePoint: 4.0 };
  } else if (percentage >= 80) {
    return { grade: 'A', gradePoint: 3.6 };
  } else if (percentage >= 70) {
    return { grade: 'B+', gradePoint: 3.2 };
  } else if (percentage >= 60) {
    return { grade: 'B', gradePoint: 2.8 };
  } else if (percentage >= 50) {
    return { grade: 'C', gradePoint: 2.4 };
  } else if (percentage >= 40) {
    return { grade: 'D', gradePoint: 2.0 };
  } else {
    return { grade: 'F', gradePoint: 0.0 };
  }
};

export const calculateOverallGrade = (percentage) => {
  if (percentage >= 90) {
    return { grade: 'A+', gpa: 4.0 };
  } else if (percentage >= 80) {
    return { grade: 'A', gpa: 3.6 };
  } else if (percentage >= 70) {
    return { grade: 'B+', gpa: 3.2 };
  } else if (percentage >= 60) {
    return { grade: 'B', gpa: 2.8 };
  } else if (percentage >= 50) {
    return { grade: 'C', gpa: 2.4 };
  } else if (percentage >= 40) {
    return { grade: 'D', gpa: 2.0 };
  } else {
    return { grade: 'F', gpa: 0.0 };
  }
};
