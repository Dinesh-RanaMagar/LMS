import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { attendanceAPI, classAPI, studentAPI } from '../services/api';

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50';

const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [records, setRecords] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [classRes, studentRes] = await Promise.all([classAPI.getAll(), studentAPI.getAll()]);
    setClasses(classRes.data.classes || []);
    setStudents(studentRes.data.students || []);
  };

  const filtered = students.filter((s) => (!className || s.className === className) && (!section || s.section === section));
  const sections = classes.find((c) => c.className === className)?.sections || [];

  const save = async () => {
    const payload = filtered.map((student) => ({ person: student._id, personModel: 'Student', status: records[student._id] || 'present' }));
    await attendanceAPI.save({ date, type: 'student', className, section, records: payload });
    setMessage('Attendance saved successfully.');
    setTimeout(() => setMessage(''), 2500);
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Attendance</h1><p className="text-sm text-slate-500">Take daily student attendance by class and section.</p></div>
        {message && <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm">{message}</div>}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5 grid md:grid-cols-4 gap-4">
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          <select className={inputClass} value={className} onChange={(e) => { setClassName(e.target.value); setSection(''); }}><option value="">All classes</option>{classes.map((c) => <option key={c._id} value={c.className}>{c.className}</option>)}</select>
          <select className={inputClass} value={section} onChange={(e) => setSection(e.target.value)}><option value="">All sections</option>{sections.map((s) => <option key={s} value={s}>Section {s}</option>)}</select>
          <button onClick={save} className="rounded-xl bg-blue-800 text-white font-semibold">Save Attendance</button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Roll</th><th className="p-3 text-left">Student</th><th className="p-3 text-center">Status</th></tr></thead><tbody>{filtered.map((s) => <tr key={s._id} className="border-t"><td className="p-3">{s.rollNo || '-'}</td><td className="p-3 font-medium">{s.name}</td><td className="p-3 text-center"><select className="px-3 py-1.5 border rounded-lg" value={records[s._id] || 'present'} onChange={(e) => setRecords({ ...records, [s._id]: e.target.value })}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="leave">Leave</option></select></td></tr>)}</tbody></table>
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;
