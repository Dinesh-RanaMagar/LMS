/**
 * One-time migration: create StudentEnrollment records for every existing
 * Student document that does not already have one.
 *
 * Safe to run repeatedly — skips students that already have an enrollment
 * for their stored academicYear.
 */
import Student from "../model/StudentModel.js";
import StudentEnrollment from "../model/StudentEnrollmentModel.js";

export const migrateEnrollments = async () => {
  try {
    const students = await Student.find({});
    let created = 0;
    let skipped = 0;

    for (const student of students) {
      if (!student.academicYear || !student.className || !student.section) {
        skipped++;
        continue;
      }

      const exists = await StudentEnrollment.exists({
        student: student._id,
        academicYear: student.academicYear,
      });

      if (exists) {
        skipped++;
        continue;
      }

      await StudentEnrollment.create({
        student:      student._id,
        academicYear: student.academicYear,
        className:    student.className,
        section:      student.section,
        rollNo:       student.rollNo ?? null,
        status:       student.status === "active" ? "active" : "active",
      });
      created++;
    }

    if (created > 0 || skipped > 0) {
      console.log(
        `[EnrollmentMigration] Created: ${created}, Skipped: ${skipped}`
      );
    }
  } catch (err) {
    console.error("[EnrollmentMigration] Error:", err.message);
  }
};
