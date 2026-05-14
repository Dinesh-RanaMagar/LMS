import ClassModel from "../model/ClassModel.js";

export const createClass = async (req, res) => {
  try {
    const { className, sections, description, order, periods } = req.body;

    if (!className?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Class name is required" });
    }

    const existingClass = await ClassModel.findOne({ className: className.trim() });
    if (existingClass) {
      return res
        .status(400)
        .json({ success: false, message: "Class already exists" });
    }

    const normalizedPeriods = Array.isArray(periods)
      ? periods.map((item) => ({
          periodName: item.periodName?.trim() || '',
          subject: item.subject?.trim() || '',
          teacher: item.teacher?.trim() || '',
        }))
      : [];

    const classData = await ClassModel.create({
      className: className.trim(),
      sections: Array.isArray(sections) && sections.length > 0 ? sections : ["A", "B", "C"],
      description: description || "",
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      periods: normalizedPeriods,
    });

    res.status(201).json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllClasses = async (_req, res) => {
  try {
    const classes = await ClassModel.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    }).sort({ order: 1, className: 1 });
    res.json({ success: true, count: classes.length, classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClassById = async (req, res) => {
  try {
    const classData = await ClassModel.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }
    res.json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClass = async (req, res) => {
  try {
    const classData = await ClassModel.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const { className, sections, description, order, isActive, periods } = req.body;

    if (className && className.trim() !== classData.className) {
      const duplicate = await ClassModel.findOne({
        _id: { $ne: classData._id },
        className: className.trim(),
      });
      if (duplicate) {
        return res
          .status(400)
          .json({ success: false, message: "Class already exists" });
      }
      classData.className = className.trim();
    }

    if (Array.isArray(sections)) classData.sections = sections;
    if (description !== undefined) classData.description = description;
    if (order !== undefined) classData.order = Number.isFinite(Number(order)) ? Number(order) : 0;
    if (isActive !== undefined) classData.isActive = isActive;

    if (Array.isArray(periods)) {
      classData.periods = periods.map((item) => ({
        periodName: item.periodName?.trim() || '',
        subject: item.subject?.trim() || '',
        teacher: item.teacher?.trim() || '',
      }));
    }

    await classData.save();
    res.json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClass = async (req, res) => {
  try {
    const classData = await ClassModel.findByIdAndDelete(req.params.id);
    if (!classData) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }
    res.json({ success: true, message: "Class deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
