import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Award, BookOpen, CalendarDays, CheckCircle, GraduationCap, Image, Mail, MapPin, Phone, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { settingsAPI } from '../services/api';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${url}`;
};

const PublicWebsite = () => {
  const [settings, setSettings] = useState(null);
  const { pathname } = useLocation();

  useEffect(() => {
    settingsAPI.get().then((res) => setSettings(res.data.settings)).catch(() => {});
  }, []);

  const schoolName = settings?.schoolName || 'Nepal School ERP';
  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/academics', label: 'Academics' },
    { to: '/teachers-public', label: 'Teachers' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/notice-board', label: 'Notices' },
    { to: '/admission', label: 'Admission' },
    { to: '/contact', label: 'Contact' },
  ];

  const pageContent = {
    '/about': {
      title: 'About Our School',
      subtitle: 'A disciplined, student-centered institution focused on academic excellence and transparent administration.',
      icon: GraduationCap,
      cards: ['Our Mission', 'Our Vision', 'School Values', 'Academic Discipline', 'Student Care', 'Modern Management'],
    },
    '/principal-message': {
      title: 'Principal Message',
      subtitle: 'We believe in quality education supported by strong academic records, timely communication, and reliable result management.',
      icon: UserCheck,
      cards: ['Quality Education', 'Student Growth', 'Parent Communication', 'Transparent Results'],
    },
    '/academics': {
      title: 'Academics',
      subtitle: 'Academic programs, examination system, credit-hour GPA, marksheets, and promotion management.',
      icon: BookOpen,
      cards: ['Nursery to Class 10', 'Credit Hour GPA', 'Internal Assessment', 'Practical Evaluation', 'Final Examination', 'Promotion System'],
    },
    '/facilities': {
      title: 'Facilities',
      subtitle: 'Learning facilities designed for safe, practical, and modern education.',
      icon: Award,
      cards: ['Library', 'Computer Lab', 'Science Lab', 'Sports', 'Clean Classrooms', 'Student Support'],
    },
    '/teachers-public': {
      title: 'Teachers',
      subtitle: 'Dedicated teachers supporting students with subject knowledge and care.',
      icon: Users,
      cards: ['English Department', 'Nepali Department', 'Mathematics', 'Science', 'Social Studies', 'Computer'],
    },
    '/gallery': {
      title: 'Gallery',
      subtitle: 'School activities, programs, events, and student achievements.',
      icon: Image,
      cards: ['Annual Program', 'Sports Day', 'Science Exhibition', 'Class Activities', 'Cultural Event', 'Prize Distribution'],
    },
    '/notice-board': {
      title: 'Notice Board',
      subtitle: 'Important updates, exam routines, events, and school announcements.',
      icon: CalendarDays,
      cards: ['Exam Routine', 'Admission Notice', 'Holiday Notice', 'Result Notice', 'Parent Meeting', 'School Events'],
    },
    '/admission': {
      title: 'Admission Info',
      subtitle: 'Admission process, required documents, available classes, and contact information.',
      icon: CheckCircle,
      cards: ['Admission Form', 'Birth Certificate', 'Transfer Certificate', 'Previous Marksheet', 'Parent Contact', 'Entrance/Interview'],
    },
    '/result-verification': {
      title: 'Result Verification',
      subtitle: 'Verify student marksheets and academic results issued by the school.',
      icon: ShieldCheck,
      cards: ['Symbol Number', 'Academic Year', 'Exam Name', 'Student Details', 'Verified Marksheet', 'Official Record'],
    },
    '/contact': {
      title: 'Contact Us',
      subtitle: `${settings?.address || 'Kathmandu, Nepal'} · ${settings?.phone || '+977-9800000000'} · ${settings?.email || 'info@school.edu.np'}`,
      icon: Phone,
      cards: ['School Office', 'Admission Desk', 'Exam Section', 'Administration', 'Email Support', 'Location Map'],
    },
  };

  const currentPage = pageContent[pathname];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-800 text-white flex items-center justify-center overflow-hidden">{settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="School logo" className="w-9 h-9 object-contain bg-white rounded-xl" /> : <GraduationCap />}</div><div><h1 className="font-bold text-lg">{schoolName}</h1><p className="text-xs text-slate-500">{settings?.slogan || 'Quality Education, Smart Management'}</p></div></Link>
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">{navLinks.map((link) => <Link key={link.to} to={link.to} className={pathname === link.to ? 'text-blue-800 font-bold' : 'text-slate-600 hover:text-blue-800'}>{link.label}</Link>)}<Link to="/login" className="px-4 py-2 rounded-xl bg-blue-800 text-white">Admin Login</Link></nav>
        </div>
      </header>
      {currentPage ? (
        <main>
          <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-sky-600 text-white">
            <div className="max-w-7xl mx-auto px-4 py-20">
              <currentPage.icon size={44} className="mb-5" />
              <h2 className="text-4xl lg:text-6xl font-extrabold leading-tight">{currentPage.title}</h2>
              <p className="mt-5 text-blue-100 text-lg max-w-3xl">{currentPage.subtitle}</p>
            </div>
          </section>
          <section className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-5">
            {currentPage.cards.map((item) => <div key={item} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"><CheckCircle className="text-teal-500 mb-3" /><h3 className="font-bold">{item}</h3><p className="text-sm text-slate-500 mt-2">Information and services from {schoolName}.</p></div>)}
          </section>
        </main>
      ) : (
        <main>
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-sky-600 text-white">
            <div className="max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-10 items-center">
              <div><p className="inline-flex px-3 py-1 rounded-full bg-white/10 text-sm mb-5">Modern School Management System for Nepal</p><h2 className="text-4xl lg:text-6xl font-extrabold leading-tight">Smart academic administration for real schools.</h2><p className="mt-5 text-blue-100 text-lg">Manage students, exams, attendance, notices, marksheets, academic years, and results from one clean dashboard.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/login" className="px-6 py-3 rounded-xl bg-white text-blue-800 font-bold">Open Dashboard</Link><Link to="/contact" className="px-6 py-3 rounded-xl border border-white/40 font-bold">Contact School</Link></div></div>
              <div className="bg-white/10 rounded-3xl p-6 backdrop-blur border border-white/20 shadow-2xl"><div className="grid grid-cols-2 gap-4">{['Students', 'Marksheets', 'Attendance', 'Notices'].map((item) => <div key={item} className="bg-white rounded-2xl p-5 text-slate-900 shadow-lg"><CheckCircle className="text-teal-500 mb-3" /><h3 className="font-bold">{item}</h3><p className="text-xs text-slate-500 mt-1">Digital and organized</p></div>)}</div></div>
            </div>
          </section>
          <section className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-4 gap-4">{[{ icon: Users, label: 'Students', value: '1200+' }, { icon: BookOpen, label: 'Programs', value: '20+' }, { icon: ShieldCheck, label: 'Verified Results', value: '100%' }, { icon: CalendarDays, label: 'Academic Years', value: 'Digital' }].map(({ icon: Icon, label, value }) => <div key={label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"><Icon className="text-sky-500" /><p className="text-2xl font-bold mt-3">{value}</p><p className="text-sm text-slate-500">{label}</p></div>)}</section>
          <section className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-5">{navLinks.filter((link) => link.to !== '/').map((link) => <Link key={link.to} to={link.to} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition"><h3 className="font-bold">{link.label}</h3><p className="text-sm text-slate-500 mt-2">Open {link.label} page</p></Link>)}</section>
        </main>
      )}
      <footer className="bg-slate-900 text-white mt-14"><div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-6"><div><h3 className="font-bold text-lg">{schoolName}</h3><p className="text-slate-400 text-sm mt-2">{settings?.slogan || 'Academic management, marksheets, attendance, and public school website.'}</p></div><div className="flex items-center gap-2 text-slate-300"><MapPin size={18} /> {settings?.address || 'Kathmandu, Nepal'}</div><div className="flex items-center gap-2 text-slate-300"><Phone size={18} /> {settings?.phone || '+977-9800000000'}</div><div className="flex items-center gap-2 text-slate-300"><Mail size={18} /> {settings?.email || 'info@school.edu.np'}</div></div></footer>
    </div>
  );
};

export default PublicWebsite;
