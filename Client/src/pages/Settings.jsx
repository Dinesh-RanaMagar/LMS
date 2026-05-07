import React, { useEffect, useState } from 'react';
import { Building2, Image, Save } from 'lucide-react';
import Layout from '../components/Layout';
import { settingsAPI } from '../services/api';

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-slate-50 focus:bg-white';

const defaultSettings = {
  schoolName: '',
  schoolCode: '',
  logoUrl: '',
  headTeacherSignatureUrl: '',
  address: '',
  municipality: '',
  district: '',
  province: '',
  phone: '',
  alternatePhone: '',
  email: '',
  website: '',
  principalName: '',
  headTeacherName: '',
  establishedYear: '',
  panNumber: '',
  slogan: '',
  marksheetTemplate: 'default',
};

const Settings = () => {
  const [form, setForm] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.get();
      setForm({ ...defaultSettings, ...(res.data.settings || {}) });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${url}`;
  };

  const handleImageUpload = async (field, file) => {
    if (!file) return;
    setError('');
    setUploading(field);
    try {
      const res = await settingsAPI.uploadImage(file);
      updateField(field, res.data.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading('');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await settingsAPI.update(form);
      setForm({ ...defaultSettings, ...(res.data.settings || {}) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">School Settings</h1>
          <p className="text-sm text-slate-500">Manage school details used in website, marksheets, reports, and certificates.</p>
        </div>

        {saved && <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 text-sm">Settings saved successfully.</div>}
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}

        <form onSubmit={submit} className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Section icon={<Building2 size={18} />} title="Basic School Information">
              <Field label="School Name" value={form.schoolName} onChange={(value) => updateField('schoolName', value)} required />
              <Field label="School Code" value={form.schoolCode} onChange={(value) => updateField('schoolCode', value)} />
              <Field label="Established Year" value={form.establishedYear} onChange={(value) => updateField('establishedYear', value)} />
              <Field label="PAN / Registration No." value={form.panNumber} onChange={(value) => updateField('panNumber', value)} />
              <div className="md:col-span-2">
                <Field label="School Slogan / Motto" value={form.slogan} onChange={(value) => updateField('slogan', value)} />
              </div>
            </Section>

            <Section title="Address & Contact Details">
              <Field label="Address" value={form.address} onChange={(value) => updateField('address', value)} />
              <Field label="Municipality / Rural Municipality" value={form.municipality} onChange={(value) => updateField('municipality', value)} />
              <Field label="District" value={form.district} onChange={(value) => updateField('district', value)} />
              <Field label="Province" value={form.province} onChange={(value) => updateField('province', value)} />
              <Field label="Phone" value={form.phone} onChange={(value) => updateField('phone', value)} />
              <Field label="Alternate Phone" value={form.alternatePhone} onChange={(value) => updateField('alternatePhone', value)} />
              <Field label="Email" value={form.email} onChange={(value) => updateField('email', value)} type="email" />
              <Field label="Website" value={form.website} onChange={(value) => updateField('website', value)} />
            </Section>

            <Section icon={<Save size={18} />} title="Authority & Marksheet Settings">
              <Field label="Principal Name" value={form.principalName} onChange={(value) => updateField('principalName', value)} />
              <Field label="Head Teacher Name" value={form.headTeacherName} onChange={(value) => updateField('headTeacherName', value)} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Marksheet Template</label>
                <select className={inputClass} value={form.marksheetTemplate || 'default'} onChange={(e) => updateField('marksheetTemplate', e.target.value)}>
                  <option value="default">Default Professional Template</option>
                  <option value="compact">Compact Template</option>
                  <option value="nepali">Nepali School Template</option>
                </select>
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section icon={<Image size={18} />} title="Logo & Signature">
              <div className="md:col-span-2">
                <Field label="School Logo URL" value={form.logoUrl} onChange={(value) => updateField('logoUrl', value)} />
                <UploadField label="Upload School Logo" uploading={uploading === 'logoUrl'} onChange={(file) => handleImageUpload('logoUrl', file)} />
                <PreviewBox src={getImageUrl(form.logoUrl)} title="Logo Preview" type="logo" />
              </div>
              <div className="md:col-span-2">
                <Field label="Head Teacher Signature URL" value={form.headTeacherSignatureUrl} onChange={(value) => updateField('headTeacherSignatureUrl', value)} />
                <UploadField label="Upload Head Teacher Signature" uploading={uploading === 'headTeacherSignatureUrl'} onChange={(file) => handleImageUpload('headTeacherSignatureUrl', file)} />
                <PreviewBox src={getImageUrl(form.headTeacherSignatureUrl)} title="Signature Preview" type="signature" />
              </div>
            </Section>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 mb-3">School Header Preview</h2>
              <div className="border border-slate-200 rounded-2xl p-4 text-center">
                {form.logoUrl ? <img src={getImageUrl(form.logoUrl)} alt="School logo" className="w-16 h-16 object-contain mx-auto mb-2" /> : <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center mx-auto mb-2"><Building2 /></div>}
                <h3 className="font-bold text-slate-900">{form.schoolName || 'School Name'}</h3>
                <p className="text-xs text-slate-500">{form.address || 'School Address'}</p>
                <p className="text-xs text-slate-500">{form.phone || 'Phone'} {form.email ? `| ${form.email}` : ''}</p>
              </div>
            </div>

            <button disabled={loading} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-60">
              <Save size={18} />
              {loading ? 'Saving...' : 'Save School Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

const Section = ({ icon, title, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <div className="flex items-center gap-2 mb-4">
      {icon && <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">{icon}</span>}
      <h2 className="font-semibold text-slate-900">{title}</h2>
    </div>
    <div className="grid md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, value, onChange, type = 'text', required = false }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type={type} className={inputClass} value={value || ''} onChange={(e) => onChange(e.target.value)} required={required} />
  </div>
);

const UploadField = ({ label, uploading, onChange }) => (
  <div className="mt-3">
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      onChange={(e) => onChange(e.target.files?.[0])}
      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
      disabled={uploading}
    />
    {uploading && <p className="text-xs text-teal-600 mt-1">Uploading...</p>}
  </div>
);

const PreviewBox = ({ src, title, type }) => (
  <div className="mt-3 border border-dashed border-slate-200 rounded-2xl min-h-28 flex items-center justify-center bg-slate-50">
    {src ? <img src={src} alt={title} className={`${type === 'signature' ? 'max-h-20' : 'max-h-24'} object-contain`} /> : <p className="text-xs text-slate-400">{title}</p>}
  </div>
);

export default Settings;
