import Subject from '../models/Subject.js';

export const createSubject = async (req, res) => {
  try {
    const { subjectName, className, section } = req.body;
    const existing = await Subject.findOne({
      subjectName: subjectName?.trim(),
      className: className?.trim(),
      section: section || '',
    });
    if (existing) {
      return res.status(400).json({ message: 'This subject is already assigned to the selected class/section' });
    }
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This subject is already assigned to the selected class/section' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const { className } = req.query;
    let query = {};
    if (className) {
      query.className = className;
    }
    const subjects = await Subject.find(query).sort({ className: 1, subjectName: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const { subjectName, className, section } = req.body;
    if (
      (subjectName && subjectName.trim() !== subject.subjectName) ||
      (className && className.trim() !== subject.className) ||
      (section !== undefined && section !== subject.section)
    ) {
      const duplicate = await Subject.findOne({
        _id: { $ne: subject._id },
        subjectName: subjectName?.trim() || subject.subjectName,
        className: className?.trim() || subject.className,
        section: section !== undefined ? section : subject.section,
      });
      if (duplicate) {
        return res.status(400).json({ message: 'This subject is already assigned to the selected class/section' });
      }
    }

    Object.assign(subject, req.body);
    const updatedSubject = await subject.save();
    res.json(updatedSubject);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This subject is already assigned to the selected class/section' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.deleteOne();
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
