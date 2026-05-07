import AcademicYear from '../models/AcademicYear.js';

export const createAcademicYear = async (req, res) => {
  try {
    const { yearName, startDate, endDate, isActive } = req.body;

    const yearExists = await AcademicYear.findOne({ yearName });
    if (yearExists) {
      return res.status(400).json({ message: 'Academic year already exists' });
    }

    const academicYear = await AcademicYear.create({
      yearName,
      startDate,
      endDate,
      isActive,
    });

    res.status(201).json(academicYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAcademicYears = async (req, res) => {
  try {
    const academicYears = await AcademicYear.find().sort({ createdAt: -1 });
    res.json(academicYears);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAcademicYearById = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    res.json(academicYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }

    const { yearName, startDate, endDate, isActive } = req.body;

    academicYear.yearName = yearName || academicYear.yearName;
    academicYear.startDate = startDate || academicYear.startDate;
    academicYear.endDate = endDate || academicYear.endDate;
    academicYear.isActive = isActive !== undefined ? isActive : academicYear.isActive;

    const updatedAcademicYear = await academicYear.save();
    res.json(updatedAcademicYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setActiveAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }

    await AcademicYear.updateMany({}, { isActive: false });

    academicYear.isActive = true;
    const updatedAcademicYear = await academicYear.save();

    res.json(updatedAcademicYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }

    await academicYear.deleteOne();
    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
