import Class from '../models/Class.js';

export const createClass = async (req, res) => {
  try {
    const { className, sections, description, order } = req.body;
    
    const existingClass = await Class.findOne({ className });
    if (existingClass) {
      return res.status(400).json({ message: 'Class already exists' });
    }
    
    const newClass = new Class({
      className,
      sections: sections || ['A', 'B', 'C'],
      description,
      order: order || 0,
    });
    
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getClassById = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(classItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateClass = async (req, res) => {
  try {
    const { className, sections, description, order, isActive } = req.body;
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { className, sections, description, order, isActive },
      { new: true }
    );
    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    await Class.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
