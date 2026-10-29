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


// Origins are validated per-request so the same backend serves both the local
// dev client (any localhost port) and the Netlify deployment (incl. deploy previews).
const staticOrigins = [
  'https://jananamuna.netlify.app',
];

// Extra origins can be supplied via the environment, e.g.
// CORS_ORIGINS="https://example.com,https://staging.example.com"
// Read lazily because dotenv.config() runs after this module is imported.
const getEnvOrigins = () =>
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
  // No Origin header: same-origin requests, curl/Postman, server-to-server.
  if (!origin) return true;
  if (staticOrigins.includes(origin) || getEnvOrigins().includes(origin)) return true;

  return (
    // Netlify production site + branch/deploy previews (e.g. branch--site.netlify.app)
    /^https:\/\/([a-z0-9-]+--)?jananamuna\.netlify\.app$/.test(origin)
    // Local development: Vite dev server and `vite preview` on any port
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
};

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
});

export default app;
