# School Management System - MERN Stack

A complete admin-only school management system built with MongoDB, Express, React, and Node.js.

## Features

### 🔐 Authentication
- Admin login with JWT
- Secure password hashing with bcrypt
- Single admin account (no public registration after setup)
- Protected routes with middleware

### 📚 Student Management
- Add, view, edit, delete students
- Student fields: name, className, section, rollNo, symbolNo, dob, fatherName, motherName, address

### 📝 Exam Management
- Create exams with multiple subjects
- Subject fields: name, fullMarks, passMarks
- Edit and delete exams

### ✍️ Marks Entry
- Enter marks for students
- Fields: theory marks, practical marks
- Automatic calculation and validation

### 📊 Marksheet Generation
- Auto-calculate:
  - Total marks
  - Percentage
  - GPA (0-4 scale)
  - Grade (A+ to F)
  - Pass/Fail status
- View detailed marksheets
- Print marksheets as PDF

## Project Structure

```
school-management/
├── Server/
│   ├── config/
│   │   └── db.js
│   ├── controller/
│   │   ├── adminController.js
│   │   ├── studentController.js
│   │   ├── examController.js
│   │   └── marksheetController.js
│   ├── Middleware/
│   │   └── auth.js
│   ├── model/
│   │   ├── adminModel.js
│   │   ├── StudentModel.js
│   │   ├── examModel.js
│   │   └── MarksheetModel.js
│   ├── route/
│   │   ├── adminRoute.js
│   │   ├── studentRoute.js
│   │   ├── examRoute.js
│   │   └── marksheetRoute.js
│   ├── app.js
│   ├── index.js
│   ├── .env
│   └── package.json
│
└── Client/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Students.jsx
    │   │   ├── AddEditStudent.jsx
    │   │   ├── Exams.jsx
    │   │   ├── AddEditExam.jsx
    │   │   ├── MarksEntry.jsx
    │   │   └── Marksheets.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env
    └── package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to Server directory:
```bash
cd Server
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (.env):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/school_management
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
NODE_ENV=development
```

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Run the server:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Seed Default Classes

To add the default school classes from Command Prompt, run:

```bash
cd Server
npm run seed:classes
```

This command resets and creates:

- **Nursery**
- **KG**
- **Class 1** to **Class 5** without sections
- **Class 6** to **Class 10** with only two sections: **A** and **B**

### Frontend Setup

1. Navigate to Client directory:
```bash
cd Client
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (.env):
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### Admin
- `POST /api/admin/register` - Register admin (once only)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile (protected)
- `POST /api/admin/logout` - Admin logout (protected)

### Students
- `POST /api/students` - Create student
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Exams
- `POST /api/exams` - Create exam
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get exam by ID
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam

### Marksheets
- `POST /api/marksheets` - Create marksheet
- `GET /api/marksheets` - Get all marksheets
- `GET /api/marksheets/:id` - Get marksheet by ID
- `GET /api/marksheets/student/:studentId` - Get marksheets by student
- `GET /api/marksheets/exam/:examId` - Get marksheets by exam
- `GET /api/marksheets/student/:studentId/exam/:examId` - Get specific marksheet
- `PUT /api/marksheets/:id` - Update marksheet
- `DELETE /api/marksheets/:id` - Delete marksheet

## Usage

### First Time Setup

1. **Create Admin Account**
   - Navigate to `/register`
   - Enter admin name, email, and password
   - This only works once

2. **Login**
   - Go to `/login`
   - Enter credentials
   - You'll be redirected to dashboard

### Adding Students

1. Click "Add Student" from dashboard
2. Fill in student details
3. Click "Add Student"

### Assigning Subjects to Classes

1. Go to "Classes & Subject Setup".
2. Click "Assign Subjects" on the class card.
3. Select or remove subjects using the checkboxes.
4. Click "Save".

Subject assignment only controls which subjects belong to a class. Full marks, pass marks, theory marks, and practical marks are not entered in the class subject assignment form.

### Creating Exams

1. Click "Create Exam" from dashboard
2. Enter exam name, class, and year
3. Add subjects with full marks and pass marks
4. Click "Create Exam"

### Entering Marks

1. Go to "Enter Marks" page
2. Select exam and student
3. Enter theory and practical marks
4. Click "Save Marks"

### Viewing Marksheets

1. Go to "View Marksheets" page
2. See all marksheets in a table
3. Click "Print" to generate PDF
4. Click "View" to see details

## Grade Calculation System

- **A+**: 90% and above
- **A**: 80-89%
- **B+**: 70-79%
- **B**: 60-69%
- **C**: 50-59%
- **D**: 40-49%
- **F**: Below 40%

**GPA**: Calculated on 4.0 scale = (Percentage / 100) * 4

**Result**: Pass if all subjects >= pass marks, Fail otherwise

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Protected routes with auth middleware
- CORS enabled
- Environment variables for sensitive data
- Input validation on both frontend and backend

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + bcryptjs
- **Validation**: Built-in validation

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Development

### Backend Development
```bash
cd Server
npm run dev
```

### Frontend Development
```bash
cd Client
npm run dev
```

### Build Frontend for Production
```bash
cd Client
npm run build
npm run preview
```

## Environment Variables

### Server (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/school_management
JWT_SECRET=your_secure_secret_key
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
NODE_ENV=development
```

### Client (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## Common Issues & Solutions

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify connection string format

### CORS Errors
- Ensure backend is running on correct port
- Check CORS configuration in app.js
- Verify API_URL in frontend .env

### Authentication Issues
- Clear localStorage
- Check JWT_SECRET matches
- Verify token expiration

### Port Already in Use
- Change PORT in .env
- Or kill process using the port:
  ```bash
  # On Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # On macOS/Linux
  lsof -i :5000
  kill -9 <PID>
  ```

## Future Enhancements

- Multi-admin support
- Parent login portal
- Student view (read-only)
- SMS/Email notifications
- Advanced analytics
- Attendance management
- Assignment submission
- Online exams

## License

MIT

## Support

For issues and questions, please refer to the documentation or create an issue in the repository.

---

**Built with ❤️ for School Management**
# LMS
