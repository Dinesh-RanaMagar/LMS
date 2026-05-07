import AcademicYear from "../model/AcademicYearModel.js";

export const createAcademicYear = async (req, res) => {
  try {
    const { yearName, startDate, endDate, isActive } = req.body;

    if (!yearName || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Year name, start date, and end date are required",
      });
    }

    const exists = await AcademicYear.findOne({ yearName: yearName.trim() });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Academic year already exists" });
    }

    const academicYear = await AcademicYear.create({
      yearName: yearName.trim(),
      startDate,
      endDate,
      isActive: Boolean(isActive),
    });

    res.status(201).json({ success: true, academicYear });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAcademicYears = async (_req, res) => {
  try {
    const academicYears = await AcademicYear.find().sort({ createdAt: -1 });
    res.json({ success: true, count: academicYears.length, academicYears });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAcademicYearById = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ success: false, message: "Academic year not found" });
    }
    res.json({ success: true, academicYear });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ success: false, message: "Academic year not found" });
    }

    const { yearName, startDate, endDate, isActive } = req.body;

    if (yearName && yearName.trim() !== academicYear.yearName) {
      const duplicate = await AcademicYear.findOne({
        _id: { $ne: academicYear._id },
        yearName: yearName.trim(),
      });
      if (duplicate) {
        return res
          .status(400)
          .json({ success: false, message: "Academic year already exists" });
      }
      academicYear.yearName = yearName.trim();
    }

    if (startDate) academicYear.startDate = startDate;
    if (endDate) academicYear.endDate = endDate;
    if (isActive !== undefined) academicYear.isActive = isActive;

    await academicYear.save();
    res.json({ success: true, academicYear });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setActiveAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ success: false, message: "Academic year not found" });
    }

    await AcademicYear.updateMany({}, { isActive: false });
    academicYear.isActive = true;
    await academicYear.save();

    res.json({ success: true, academicYear });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ success: false, message: "Academic year not found" });
    }
    res.json({ success: true, message: "Academic year deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
