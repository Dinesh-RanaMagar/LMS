import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { teacherAPI } from '../services/api';

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', qualification: '', assignedSubjects: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async () => {
    const res = await teacherAPI.getAll();
    setTeachers(res.data.teachers || []);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await teacherAPI.create({ ...form, assignedSubjects: form.assignedSubjects.split(',').map((s) => s.trim()).filter(Boolean) });
      setForm({ name: '', email: '', phone: '', qualification: '', assignedSubjects: '' });
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Teacher Management</h1>
          <p className="text-sm text-slate-500">Manage teacher profiles, contacts, and assigned subjects.</p>
        </div>
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">Add Teacher</h2>
            <input className={inputClass} placeholder="Teacher name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={inputClass} placeholder="Qualification" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
            <input className={inputClass} placeholder="Subjects comma separated" value={form.assignedSubjects} onChange={(e) => setForm({ ...form, assignedSubjects: e.target.value })} />
            <button disabled={loading} className="w-full py-2.5 rounded-xl bg-blue-800 text-white font-semibold disabled:opacity-60">{loading ? 'Saving...' : 'Save Teacher'}</button>
          </form>
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Subjects</th></tr></thead>
              <tbody>{teachers.map((t) => <tr key={t._id} className="border-t"><td className="p-3 font-medium">{t.name}</td><td className="p-3">{t.phone || '-'}</td><td className="p-3">{(t.assignedSubjects || []).join(', ') || '-'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Teachers;
