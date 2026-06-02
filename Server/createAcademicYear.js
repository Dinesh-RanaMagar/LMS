import crypto from 'crypto';
import mongoose from 'mongoose';
import AcademicYear from './model/AcademicYearModel.js';
import dotenv from 'dotenv';

// Ensure crypto is available globally
global.crypto = crypto;

dotenv.config();

async function createAcademicYear() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const yearName = '2024-2025';
    
    const existingYear = await AcademicYear.findOne({ yearName });
    if (existingYear) {
      if (!existingYear.isActive) {
        existingYear.isActive = true;
        await existingYear.save();
        console.log(`Academic year "${yearName}" already exists. Activated it.`);
      } else {
        console.log(`Academic year "${yearName}" already exists and is active.`);
      }
    } else {
      const currentYear = new Date().getFullYear();
      const academicYear = await AcademicYear.create({
        yearName,
        startDate: new Date(currentYear, 3, 1), // April 1st
        endDate: new Date(currentYear + 1, 2, 31), // March 31st next year
        isActive: true,
      });
      console.log('Academic year created successfully!');
      console.log('Year:', academicYear.yearName);
      console.log('Start Date:', academicYear.startDate.toDateString());
      console.log('End Date:', academicYear.endDate.toDateString());
      console.log('Status: Active ✓');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAcademicYear();
