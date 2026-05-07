import Attendance from "../model/AttendanceModel.js";

export const saveAttendance = async (req, res) => {
  try {
    const { date, type = "student", className = "", section = "", records = [] } = req.body;
    if (!date || !Array.isArray(records)) return res.status(400).json({ success: false, message: "Date and records are required" });

    const attendance = await Attendance.findOneAndUpdate(
      { date: new Date(date), type, className, section },
      { date: new Date(date), type, className, section, records },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.className) filter.className = req.query.className;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.date) filter.date = new Date(req.query.date);

    const attendance = await Attendance.find(filter).sort({ date: -1 }).populate("records.person");
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: "Attendance not found" });
    res.json({ success: true, message: "Attendance deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
