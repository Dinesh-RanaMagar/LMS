import SchoolSettings from "../model/SchoolSettingsModel.js";

export const getSchoolSettings = async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) settings = await SchoolSettings.create({});
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSchoolSettings = async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) settings = await SchoolSettings.create(req.body);
    else settings = await SchoolSettings.findByIdAndUpdate(settings._id, req.body, { new: true, runValidators: true });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
