import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoute from './route/adminRoute.js';
import studentRoute from './route/studentRoute.js';
import examRoute from './route/examRoute.js';
import marksheetRoute from './route/marksheetRoute.js';
import subjectRoute from './route/subjectRoute.js';
import classRoute from './route/classRoute.js';
import academicYearRoute from './route/academicYearRoute.js';
import promotionRoute from './route/promotionRoute.js';
import classSubjectRoute from './route/classSubjectRoute.js';
import teacherRoute from './route/teacherRoute.js';
import noticeRoute from './route/noticeRoute.js';
import attendanceRoute from './route/attendanceRoute.js';
import schoolSettingsRoute from './route/schoolSettingsRoute.js';
import uploadRoute from './route/uploadRoute.js';
import evaluationRoute from './route/evaluationRoute.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/admin', adminRoute);
app.use('/api/students', studentRoute);
app.use('/api/exams', examRoute);
app.use('/api/marksheets', marksheetRoute);
app.use('/api/subjects', subjectRoute);
app.use('/api/classes', classRoute);
app.use('/api/class-subjects', classSubjectRoute);
app.use('/api/academic-years', academicYearRoute);
app.use('/api/promotions', promotionRoute);
app.use('/api/teachers', teacherRoute);
app.use('/api/notices', noticeRoute);
app.use('/api/attendance', attendanceRoute);
app.use('/api/settings', schoolSettingsRoute);
app.use('/api/evaluation', evaluationRoute);
app.use('/api/uploads', uploadRoute);

// Express v5 compatible error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
});

export default app;
