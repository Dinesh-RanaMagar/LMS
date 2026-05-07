import Subject from "../model/SubjectModel.js";

// CREATE SUBJECT
export const createSubject = async (req, res) => {
    try {
        const { subjectName, code, description } = req.body;

        if (!subjectName) {
            return res.status(400).json({ success: false, message: "Subject name is required" });
        }

        const existing = await Subject.findOne({ subjectName: subjectName.trim() });
        if (existing) {
            return res.status(400).json({ success: false, message: "Subject already exists" });
        }

        const subject = await Subject.create({ subjectName: subjectName.trim(), code, description });
        res.status(201).json({ success: true, message: "Subject created successfully", subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET ALL SUBJECTS
export const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ subjectName: 1 });
        res.json({ success: true, count: subjects.length, subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET SUBJECT BY ID
export const getSubjectById = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
        res.json({ success: true, subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE SUBJECT
export const updateSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });

        const { subjectName, code, description } = req.body;

        if (subjectName && subjectName.trim() !== subject.subjectName) {
            const duplicate = await Subject.findOne({
                _id: { $ne: subject._id },
                subjectName: subjectName.trim()
            });
            if (duplicate) {
                return res.status(400).json({ success: false, message: "Subject name already exists" });
            }
            subject.subjectName = subjectName.trim();
        }

        if (code !== undefined) subject.code = code;
        if (description !== undefined) subject.description = description;

        await subject.save();
        res.json({ success: true, message: "Subject updated successfully", subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE SUBJECT
export const deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findByIdAndDelete(req.params.id);
        if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
        res.json({ success: true, message: "Subject deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
