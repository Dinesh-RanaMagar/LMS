import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { noticeAPI } from '../services/api';

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-slate-50';

const Notices = () => {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', isPinned: false, isPublished: true });

  useEffect(() => { fetchNotices(); }, []);

  const fetchNotices = async () => {
    const res = await noticeAPI.getAll();
    setNotices(res.data.notices || []);
  };

  const submit = async (e) => {
    e.preventDefault();
    await noticeAPI.create(form);
    setForm({ title: '', message: '', audience: 'all', isPinned: false, isPublished: true });
    fetchNotices();
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Notice Management</h1><p className="text-sm text-slate-500">Publish notices for students, teachers, and parents.</p></div>
        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">Create Notice</h2>
            <input className={inputClass} placeholder="Notice title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea className={inputClass} rows="5" placeholder="Notice message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            <select className={inputClass} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}><option value="all">All</option><option value="students">Students</option><option value="teachers">Teachers</option><option value="parents">Parents</option></select>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} /> Pin notice</label>
            <button className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-semibold">Publish Notice</button>
          </form>
          <div className="lg:col-span-2 space-y-3">
            {notices.map((n) => <div key={n._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><div className="flex justify-between gap-3"><h3 className="font-bold text-slate-900">{n.isPinned ? '📌 ' : ''}{n.title}</h3><span className="text-xs text-slate-400">{new Date(n.publishDate).toLocaleDateString()}</span></div><p className="text-sm text-slate-600 mt-2">{n.message}</p><p className="text-xs text-sky-600 mt-3 uppercase">{n.audience}</p></div>)}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Notices;
