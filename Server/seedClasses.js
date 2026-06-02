import mongoose from 'mongoose';
import ClassModel from './model/ClassModel.js';
import dotenv from 'dotenv';

dotenv.config();

const classes = [
  { className: "Nursery", order: 1, sections: [] },
  { className: "KG", order: 2, sections: [] },
  { className: "Class 1", order: 3, sections: [] },
  { className: "Class 2", order: 4, sections: [] },
  { className: "Class 3", order: 5, sections: [] },
  { className: "Class 4", order: 6, sections: [] },
  { className: "Class 5", order: 7, sections: [] },
  { className: "Class 6", order: 8, sections: ["A", "B"] },
  { className: "Class 7", order: 9, sections: ["A", "B"] },
  { className: "Class 8", order: 10, sections: ["A", "B"] },
  { className: "Class 9", order: 11, sections: ["A", "B"] },
  { className: "Class 10", order: 12, sections: ["A", "B"] },
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