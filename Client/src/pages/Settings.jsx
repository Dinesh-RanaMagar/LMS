import React, { useEffect, useState } from 'react';
import { Building2, Image, Save, MapPin, Award, Eye, CheckCircle, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import Layout from '../components/Layout';
import { settingsAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

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
  const { settings, setSettings, refreshSettings } = useSettings();

  useEffect(() => {
    if (settings) {
      setForm({ ...defaultSettings, ...settings });
    }
  }, [settings]);

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
      const updatedSettings = { ...defaultSettings, ...(res.data.settings || {}) };
      setForm(updatedSettings);
      setSettings(updatedSettings);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12">
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl">
                <SettingsIcon size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black">School Settings</h1>
                <p className="text-slate-300 text-lg">Configure your school's identity and preferences</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-300">Auto-save enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-slate-300">Secure storage</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {saved && (
            <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <span className="font-bold">Settings saved successfully!</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <span className="font-bold">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="grid xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <VisualSection 
                icon={<Building2 size={24} className="text-white" />} 
                title="School Identity" 
                gradient="from-indigo-500 to-purple-600"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <VisualField label="School Name" value={form.schoolName} onChange={(value) => updateField('schoolName', value)} required />
                  <VisualField label="School Code" value={form.schoolCode} onChange={(value) => updateField('schoolCode', value)} />
                  <VisualField label="Established Year" value={form.establishedYear} onChange={(value) => updateField('establishedYear', value)} />
                  <VisualField label="PAN / Registration No." value={form.panNumber} onChange={(value) => updateField('panNumber', value)} />
                </div>
                <div className="md:col-span-2">
                  <VisualField label="School Slogan / Motto" value={form.slogan} onChange={(value) => updateField('slogan', value)} />
                </div>
              </VisualSection>

              <VisualSection 
                icon={<MapPin size={24} className="text-white" />} 
                title="Location & Contact" 
                gradient="from-emerald-500 to-teal-600"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <VisualField label="Address" value={form.address} onChange={(value) => updateField('address', value)} />
                  <VisualField label="Municipality" value={form.municipality} onChange={(value) => updateField('municipality', value)} />
                  <VisualField label="District" value={form.district} onChange={(value) => updateField('district', value)} />
                  <VisualField label="Province" value={form.province} onChange={(value) => updateField('province', value)} />
                  <VisualField label="Phone" value={form.phone} onChange={(value) => updateField('phone', value)} />
                  <VisualField label="Alternate Phone" value={form.alternatePhone} onChange={(value) => updateField('alternatePhone', value)} />
                  <VisualField label="Email" value={form.email} onChange={(value) => updateField('email', value)} type="email" />
                  <VisualField label="Website" value={form.website} onChange={(value) => updateField('website', value)} />
                </div>
              </VisualSection>

              <VisualSection 
                icon={<Award size={24} className="text-white" />} 
                title="Authority & Templates" 
                gradient="from-amber-500 to-orange-600"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <VisualField label="Principal Name" value={form.principalName} onChange={(value) => updateField('principalName', value)} />
                  <VisualField label="Head Teacher Name" value={form.headTeacherName} onChange={(value) => updateField('headTeacherName', value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Marksheet Template</label>
                  <select 
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 text-sm bg-white transition-all" 
                    value={form.marksheetTemplate || 'default'} 
                    onChange={(e) => updateField('marksheetTemplate', e.target.value)}
                  >
                    <option value="default">Default Professional Template</option>
                    <option value="compact">Compact Template</option>
                    <option value="nepali">Nepali School Template</option>
                  </select>
                </div>
              </VisualSection>
            </div>

            <div className="space-y-8">
              <VisualSection 
                icon={<Image size={24} className="text-white" />} 
                title="Visual Assets" 
                gradient="from-pink-500 to-rose-600"
              >
                <div className="space-y-6">
                  <div>
                    <VisualField label="School Logo URL" value={form.logoUrl} onChange={(value) => updateField('logoUrl', value)} />
                    <VisualUploadField label="Upload School Logo" uploading={uploading === 'logoUrl'} onChange={(file) => handleImageUpload('logoUrl', file)} />
                    <VisualPreviewBox src={getImageUrl(form.logoUrl)} title="Logo Preview" type="logo" />
                  </div>
                  <div>
                    <VisualField label="Head Teacher Signature URL" value={form.headTeacherSignatureUrl} onChange={(value) => updateField('headTeacherSignatureUrl', value)} />
                    <VisualUploadField label="Upload Signature" uploading={uploading === 'headTeacherSignatureUrl'} onChange={(file) => handleImageUpload('headTeacherSignatureUrl', file)} />
                    <VisualPreviewBox src={getImageUrl(form.headTeacherSignatureUrl)} title="Signature Preview" type="signature" />
                  </div>
                </div>
              </VisualSection>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Eye size={20} className="text-indigo-500" />
                  Live Preview
                </h3>
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center bg-gradient-to-br from-slate-50 to-slate-100">
                  {form.logoUrl ? (
                    <img src={getImageUrl(form.logoUrl)} alt="School logo" className="w-20 h-20 object-contain mx-auto mb-4 rounded-2xl shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Building2 size={32} />
                    </div>
                  )}
                  <h4 className="font-black text-slate-900 text-lg">{form.schoolName || 'School Name'}</h4>
                  <p className="text-xs text-slate-500 mt-1">{form.address || 'School Address'}</p>
                  <p className="text-xs text-slate-500">{form.phone || 'Phone'} {form.email ? `| ${form.email}` : ''}</p>
                </div>
              </div>

              <button 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-4 rounded-3xl font-black text-lg shadow-2xl hover:from-teal-600 hover:to-cyan-700 transition-all transform hover:scale-105 disabled:opacity-60 disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving Settings...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Save size={24} />
                    Save All Settings
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

const VisualSection = ({ icon, title, gradient, children }) => (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
    <div className={`bg-gradient-to-r ${gradient} p-6`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          {icon}
        </div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
      </div>
    </div>
    <div className="p-6">
      <div className="space-y-6">{children}</div>
    </div>
  </div>
);

const VisualField = ({ label, value, onChange, type = 'text', required = false }) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input 
      type={type} 
      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm bg-white transition-all hover:border-slate-300" 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)} 
      required={required} 
    />
  </div>
);

const VisualUploadField = ({ label, uploading, onChange }) => (
  <div className="mt-4">
    <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
    <div className="relative">
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => onChange(e.target.files?.[0])}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-sm file:font-bold file:bg-gradient-to-r file:from-indigo-500 file:to-purple-600 file:text-white hover:file:from-indigo-600 hover:file:to-purple-700 file:transition-all"
        disabled={uploading}
      />
      {uploading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
    {uploading && <p className="text-xs text-indigo-600 mt-2 font-medium">Uploading image...</p>}
  </div>
);

const VisualPreviewBox = ({ src, title, type }) => (
  <div className="mt-4 border-2 border-dashed border-slate-200 rounded-3xl min-h-32 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 transition-all">
    {src ? (
      <img 
        src={src} 
        alt={title} 
        className={`${type === 'signature' ? 'max-h-24' : 'max-h-28'} object-contain rounded-2xl shadow-lg`} 
      />
    ) : (
      <div className="text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-2">
          <Image size={24} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-400 font-medium">{title}</p>
      </div>
    )}
  </div>
);

export default Settings;
