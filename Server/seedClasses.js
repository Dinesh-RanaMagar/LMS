import mongoose from 'mongoose';
import ClassModel from './model/ClassModel.js';
import dotenv from 'dotenv';

dotenv.config();

const classes = [
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

    for (const classData of classes) {
      const result = await ClassModel.updateOne(
        { className: classData.className },
        {
          $set: { order: classData.order, sections: classData.sections },
          $setOnInsert: {
            className: classData.className,
            description: `${classData.className} class`,
          },
        },
        { upsert: true },
      );
      console.log(`${result.upsertedCount ? 'Created' : 'Updated'} ${classData.className} with sections A and B`);
    }

    console.log('Classes 6-10 are ready.');
  } catch (error) {
    console.error('Error seeding classes:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedClasses();