export const mapAssignedSubjectsToExam = (assignedSubjects = []) =>
  assignedSubjects
    .map((assignedSubject) => {
      const subjectName = String(assignedSubject.subjectName || "").trim();
      if (!subjectName) return null;

      const fullMarks = Number(assignedSubject.fullMarks) || 100;
      const passMarks = Number(assignedSubject.passMarks) || 40;
      const theoryFullMarks = Number(assignedSubject.theoryFullMarks) || fullMarks;
      const practicalFullMarks = assignedSubject.hasPractical
        ? Number(assignedSubject.practicalFullMarks) || 0
        : 0;

      return {
        subjectName,
        fullMarks,
        passMarks,
        theoryFullMarks,
        theoryPassMarks: Number(assignedSubject.theoryPassMarks ?? passMarks),
        practicalFullMarks,
        practicalPassMarks: Number(assignedSubject.practicalPassMarks) || 0,
        hasPractical: Boolean(assignedSubject.hasPractical),
        creditHour: Number(assignedSubject.creditHour) || 0,
      };
    })
    .filter(Boolean);
