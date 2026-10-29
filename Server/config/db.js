import mongoose from 'mongoose';
import StudentEnrollment from '../model/StudentEnrollmentModel.js';
import { seedInitialData } from '../utils/seedInitialData.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    // The roll-number index was replaced with a partial index so classes
    // without sections (e.g. NURSERY) can hold several students with no roll
    // number. syncIndexes drops the legacy index and builds the new one.
    await StudentEnrollment.syncIndexes();
    await seedInitialData();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
