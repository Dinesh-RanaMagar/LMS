import mongoose from "mongoose";
import dotenv from "dotenv";
import AcademicYear from "./model/AcademicYearModel.js";
import Student from "./model/StudentModel.js";
import Class from "./model/ClassModel.js";
import Subject from "./model/SubjectModel.js";
import Exam from "./model/examModel.js";
import Marksheet from "./model/MarksheetModel.js";
import PromotionHistory from "./model/PromotionHistoryModel.js";
import Admin from "./model/adminModel.js";
import ClassSubject from "./model/ClassSubjectModel.js";

dotenv.config();

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected for seeding");
    } catch (error) {
        console.error("Connection error:", error);
        process.exit(1);
    }
};

const clearData = async () => {
    console.log("Dropping entire database for a 100% clean start...");
    try {
        // Drop the whole database to remove all data AND all indexes
        await mongoose.connection.db.dropDatabase();
        console.log("Database dropped successfully.");
    } catch (err) {
        console.warn("Warning during database drop:", err.message);
    }
};

const seed = async () => {
    try {
        await connectDB();
        await clearData();

        console.log("1. Setup Infrastructure...");
        const admin = await Admin.create({
            name: "Super Admin",
            email: "admin@school.com",
            password: "password123"
        });

        const years = [
            await AcademicYear.create({ yearName: "2081", isActive: false }),
            await AcademicYear.create({ yearName: "2082", isActive: false }),
            await AcademicYear.create({ yearName: "2083", isActive: true })
        ];

        // Use insertMany for classes to avoid individual save/index conflicts
        const classData = [];
        for (let i = 1; i <= 5; i++) {
            classData.push({ className: `Class ${i}`, sections: ["A"], order: i });
        }
        const classes = await Class.insertMany(classData);
        console.log(`   Created ${classes.length} classes.`);

        const subjects = await Subject.insertMany([
            { subjectName: "Mathematics", code: "MATH" },
            { subjectName: "Science", code: "SCI" },
            { subjectName: "English", code: "ENG" }
        ]);

        const subjectConfigs = subjects.map(s => ({
            subject: s._id, subjectName: s.subjectName, fullMarks: 100, passMarks: 40,
            theoryFullMarks: 80, practicalFullMarks: 20, hasPractical: true, creditHour: 4
        }));

        for (const cls of classes) {
            await ClassSubject.create({ className: cls.className, subjects: subjectConfigs });
        }

        console.log("2. Creating 10 Students with 3-year history...");
        const names = ["Alice", "Bob", "Charlie", "David", "Eva", "Frank", "Grace", "Henry", "Ivy", "Jack"];
        const students = [];

        for (let i = 0; i < 10; i++) {
            const startYear = i < 8 ? "2081" : "2082";
            const startClass = i < 5 ? "Class 1" : "Class 2";

            const student = await Student.create({
                name: `${names[i]} Thapa`,
                studentCode: `STU100${i}`,
                gender: i % 2 === 0 ? "Female" : "Male",
                academicRecords: []
            });
            students.push({ doc: student, currentClass: startClass, startYear });
        }

        console.log("3. Generating Terms, Exams, and Promotions...");
        const terms = ["First Term", "Second Term", "Final Term"];

        for (const year of ["2081", "2082", "2083"]) {
            console.log(`--- Processing Year ${year} ---`);
            const yearDoc = years.find(y => y.yearName === year);

            for (const termName of terms) {
                if (year === "2083" && termName !== "First Term") continue;

                const activeClassesInYear = [...new Set(students
                    .filter(s => Number(year) >= Number(s.startYear))
                    .map(s => s.currentClass))];

                if (activeClassesInYear.length === 0) continue;

                const exam = await Exam.create({
                    examName: `${termName} ${year}`,
                    academicYear: year,
                    isFinalExam: termName === "Final Term",
                    isResultPublished: true,
                    status: "completed",
                    applicableClasses: activeClassesInYear,
                    classExamConfigs: activeClassesInYear.map(className => ({
                        className,
                        subjects: subjectConfigs
                    })),
                    createdBy: admin._id
                });

                console.log(`   Created ${termName} ${year}`);

                for (const className of activeClassesInYear) {
                    const studentsInClass = students.filter(s => s.currentClass === className && Number(year) >= Number(s.startYear));

                    for (const s of studentsInClass) {
                        const hasYearRecord = s.doc.academicRecords.find(r => String(r.academicYear) === String(yearDoc._id));
                        if (!hasYearRecord) {
                            s.doc.academicRecords.push({
                                academicYear: yearDoc._id,
                                className: s.currentClass,
                                section: "A",
                                rollNo: Math.floor(Math.random() * 50) + 1,
                                status: "active"
                            });
                        }

                        const isJackFailing = s.doc.name.includes("Jack") && year === "2082" && termName === "Final Term";
                        const scoreBase = isJackFailing ? 15 : 60;

                        const marks = subjectConfigs.map(sub => {
                            const score = scoreBase + Math.floor(Math.random() * 20);
                            return {
                                subject: sub.subjectName, theory: score - 10, practical: 10,
                                fullMarks: 100, passMarks: 40, obtainedMarks: score,
                                result: score >= 40 ? "Pass" : "Fail", grade: score >= 80 ? "A" : "B"
                            };
                        });

                        await Marksheet.create({
                            student: s.doc._id, exam: exam._id, academicYear: year,
                            marks, result: isJackFailing ? "Fail" : "Pass",
                            gpa: isJackFailing ? 0.0 : 3.2, grade: isJackFailing ? "F" : "B",
                            totalMarks: marks.reduce((sum, m) => sum + m.obtainedMarks, 0),
                            totalFullMarks: 300, percentage: isJackFailing ? 15 : 75
                        });
                    }
                }
            }

            if (year !== "2083") {
                console.log(`   Handling year-end promotions for ${year}...`);
                const nextYearDoc = years.find(y => Number(y.yearName) === Number(year) + 1);

                for (const s of students) {
                    if (Number(year) < Number(s.startYear)) continue;

                    const isJackFailing = s.doc.name.includes("Jack") && year === "2082";
                    const currentYearRecord = s.doc.academicRecords.find(r => String(r.academicYear) === String(yearDoc._id));

                    if (currentYearRecord) {
                        currentYearRecord.status = isJackFailing ? "retained" : "promoted";
                        const nextClassNum = parseInt(s.currentClass.split(" ")[1]) + (isJackFailing ? 0 : 1);
                        const nextClassName = `Class ${nextClassNum}`;

                        await PromotionHistory.create({
                            student: s.doc._id, fromAcademicYear: year, toAcademicYear: nextYearDoc.yearName,
                            fromClass: s.currentClass, toClass: nextClassName,
                            resultStatus: isJackFailing ? "retained" : "promoted"
                        });

                        s.currentClass = nextClassName;
                        s.doc.academicRecords.push({
                            academicYear: nextYearDoc._id,
                            className: nextClassName,
                            section: "A",
                            rollNo: currentYearRecord.rollNo,
                            status: "active"
                        });
                    }
                }
            }
            for (const s of students) await s.doc.save();
        }

        console.log("==========================================");
        console.log("SEEDING SUCCESSFUL!");
        console.log("Database: school_management (Fully Recreated)");
        console.log("Workflow: 3 Years, 3 Terms, Automatic Promotions.");
        console.log("Admin: admin@school.com / password123");
        console.log("==========================================");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seed();