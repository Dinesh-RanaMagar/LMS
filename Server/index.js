import crypto from 'crypto';
import app from './app.js';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { migrateEnrollments } from './utils/migrateEnrollments.js';

// Ensure crypto is available globally
if (!globalThis.crypto) {
  globalThis.crypto = crypto;
}

dotenv.config();
await connectDB();

// Backfill StudentEnrollment records for any pre-existing students
await migrateEnrollments();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
