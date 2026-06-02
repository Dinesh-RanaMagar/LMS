import AcademicYear from "../model/AcademicYearModel.js";

export const createAcademicYear = async (req, res) => {
  try {
    const {
      yearName,
      dateFormat = 'AD',
      startDate,
      endDate,
      nepaliStartDate,
      nepaliEndDate,
      isActive,
    } = req.body;

    const format = dateFormat === 'BS' ? 'BS' : 'AD';
    const trimmedYear = yearName?.trim();

    if (!trimmedYear) {
      return res.status(400).json({
        success: false,
        message: 'Year name is required',
      });
    }

    if (format === 'AD') {
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start and end dates are required in AD format',
        });
      }
    } else {
      if (!nepaliStartDate || !nepaliEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Start and end dates are required in BS format',
        });
      }
    }

    const exists = await AcademicYear.findOne({ yearName: trimmedYear });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: 'Academic year already exists' });
    }

    const academicYear = await AcademicYear.create({
      yearName: trimmedYear,
      dateFormat: format,
      startDate: format === 'AD' ? startDate : undefined,
      endDate: format === 'AD' ? endDate : undefined,
      nepaliStartDate: format === 'BS' ? nepaliStartDate.trim() : '',
      nepaliEndDate: format === 'BS' ? nepaliEndDate.trim() : '',
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

    const {
      yearName,
      dateFormat,
      startDate,
      endDate,
      nepaliStartDate,
      nepaliEndDate,
      isActive,
    } = req.body;

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

    const format = dateFormat === 'BS' ? 'BS' : dateFormat === 'AD' ? 'AD' : academicYear.dateFormat;
    academicYear.dateFormat = format;

    if (format === 'AD') {
      if (dateFormat === 'AD' && (!startDate || !endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Start and end dates are required in AD format',
        });
      }
      if (startDate) academicYear.startDate = startDate;
      if (endDate) academicYear.endDate = endDate;
      if (dateFormat === 'AD') {
        academicYear.nepaliStartDate = '';
        academicYear.nepaliEndDate = '';
      }
    } else {
      if (dateFormat === 'BS' && (!nepaliStartDate || !nepaliEndDate)) {
        return res.status(400).json({
          success: false,
          message: 'Start and end dates are required in BS format',
        });
      }
      if (nepaliStartDate) academicYear.nepaliStartDate = nepaliStartDate.trim();
      if (nepaliEndDate) academicYear.nepaliEndDate = nepaliEndDate.trim();
      if (dateFormat === 'BS') {
        academicYear.startDate = undefined;
        academicYear.endDate = undefined;
      }
    }

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
