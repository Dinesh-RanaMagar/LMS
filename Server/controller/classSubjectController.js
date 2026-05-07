import ClassSubject from '../model/ClassSubjectModel.js';

export const getClassSubjectAssignments = async (req, res) => {
  try {
    const assignments = await ClassSubject.find().sort({ className: 1 });
    res.json({ success: true, count: assignments.length, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrUpdateClassSubjects = async (req, res) => {
  try {
    const { className, subjects } = req.body;

    if (!className || !className.trim()) {
      return res.status(400).json({ success: false, message: 'Class name is required' });
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one subject must be assigned' });
    }

    const sanitizedSubjects = subjects.map((item) => ({
      subject: item.subject?.trim() || '',
      subjectName: item.subjectName?.trim() || '',
      fullMarks: Number(item.fullMarks) || 100,
      passMarks: Number(item.passMarks) || 40,
      theoryFullMarks: Number(item.theoryFullMarks) || 100,
      practicalFullMarks: Number(item.practicalFullMarks) || 0,
      hasPractical: Boolean(item.hasPractical),
    }));

    const assignment = await ClassSubject.findOneAndUpdate(
      { className: className.trim() },
      { className: className.trim(), subjects: sanitizedSubjects },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
