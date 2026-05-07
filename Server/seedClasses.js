import mongoose from 'mongoose';
import ClassModel from './model/ClassModel.js';
import dotenv from 'dotenv';

dotenv.config();

const classes = [
  { className: "Nursery", order: 1 },
  { className: "LKG", order: 2 },
  { className: "UKG", order: 3 },
  { className: "Class 1", order: 4 },
  { className: "Class 2", order: 5 },
  { className: "Class 3", order: 6 },
  { className: "Class 4", order: 7 },
  { className: "Class 5", order: 8 },
  { className: "Class 6", order: 9 },
  { className: "Class 7", order: 10 },
  { className: "Class 8", order: 11 },
  { className: "Class 9", order: 12 },
  { className: "Class 10", order: 13 },
  { className: "Class 11", order: 14 },
  { className: "Class 12", order: 15 },
];

async function seedClasses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school');
    console.log('Connected to MongoDB');

    // Clear existing classes
    await ClassModel.deleteMany({});
    console.log('Cleared existing classes');

    // Insert new classes
    for (const classData of classes) {
      const existingClass = await ClassModel.findOne({ className: classData.className });
      if (!existingClass) {
        await ClassModel.create({
          ...classData,
          sections: ["A", "B", "C"],
          description: `${classData.className} class`,
        });
        console.log(`Created class: ${classData.className}`);
      }
    }

    console.log('Classes seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding classes:', error);
    process.exit(1);
  }
}

seedClasses();