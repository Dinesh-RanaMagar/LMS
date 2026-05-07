import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { classAPI, studentAPI } from '../services/api';
import Layout from '../components/Layout';
import { ArrowLeft, User } from 'lucide-react';

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition';

const removeEmptyOptionalFields = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => !(typeof value === 'string' && value.trim() === ''))
  );

const AddEditStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '', className: '', section: '', rollNo: '',
    emisCode: '', studentCode: '', symbolNo: '', dob: '', fatherName: '', motherName: '', guardianName: '', mobileNumber: '', address: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [suggestedRollNo, setSuggestedRollNo] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (isEdit) fetchStudent();
  }, [id]);

  useEffect(() => {
    if (!isEdit && formData.className && formData.section) {
      suggestNextRollNo();
    }
  }, [formData.className, formData.section]);

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await classAPI.getAll();
      const classList = response.data?.classes || response.data || [];
      setClasses(classList);
    } catch (err) {
      setError('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchStudent = async () => {
    try {
      const response = await studentAPI.getById(id);
      const student = response.data.student;
      setFormData({
        name: student.name || '',
        className: student.className || '',
        section: student.section || '',
        rollNo: student.rollNo || '',
        emisCode: student.emisCode || '',
        studentCode: student.studentCode || '',
        symbolNo: student.symbolNo || '',
        dob: student.dob ? student.dob.split('T')[0] : '',
        fatherName: student.fatherName || '',
        motherName: student.motherName || '',
        guardianName: student.guardianName || '',
        mobileNumber: student.mobileNumber || '',
        address: student.address || '',
      });
    } catch (err) {
      setError('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const suggestNextRollNo = async () => {
    try {
      const response = await studentAPI.getAll({
        className: formData.className,
        section: formData.section,
      });
      const students = response.data?.students || response.data || [];
      const maxRollNo = students.reduce((max, student) => {
        const rollNo = Number(student.rollNo);
        return Number.isFinite(rollNo) && rollNo > max ? rollNo : max;
      }, 0);
      const nextRollNo = String(maxRollNo + 1);
      setSuggestedRollNo(nextRollNo);
      setFormData((prev) => (prev.rollNo ? prev : { ...prev, rollNo: nextRollNo }));
    } catch {
      setSuggestedRollNo('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'className') {
        return { ...prev, className: value, section: '' };
      }
      return { ...prev, [name]: value };
    });
    if (error) setError('');
  };

  const selectedClass = classes.find((cls) => cls.className === formData.className);
  const sectionOptions = (selectedClass?.sections || []).filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.className || !formData.section) {
      return setError('Name, class, and section are required');
    }
    setSubmitting(true);
    try {
      const { studentCode, ...payload } = removeEmptyOptionalFields(formData);
      if (isEdit) {
        await studentAPI.update(id, payload);
      } else {
        await studentAPI.create(payload);
      }
      navigate('/students');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/students')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium transition"
        >
          <ArrowLeft size={18} />
          Back to Students
        </button>

        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <User size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Student' : 'Add New Student'}
            </h1>
            <p className="text-gray-400 text-sm">
              {isEdit ? 'Update student information' : 'Fill in the details to register a new student'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading || loadingClasses ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    className={inputClass} placeholder="Student's full name" required />
                </Field>
                <Field label="Class" required>
                  <select
                    name="className"
                    value={formData.className}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls.className}>
                        {cls.className}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Section" required>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    className={inputClass}
                    required
                    disabled={!formData.className || sectionOptions.length === 0}
                  >
                    <option value="">
                      {!formData.className
                        ? 'Select class first'
                        : sectionOptions.length === 0
                          ? 'No sections in this class'
                          : 'Select section'}
                    </option>
                    {sectionOptions.map((section) => (
                      <option key={section} value={section}>
                        Section {section}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Roll Number">
                  <input type="number" name="rollNo" value={formData.rollNo} onChange={handleChange}
                    className={inputClass} placeholder="1" />
                  {!isEdit && suggestedRollNo && (
                    <p className="text-xs text-indigo-600 mt-1">Suggested roll number: {suggestedRollNo}</p>
                  )}
                </Field>
                <Field label="EMIS Code">
                  <input type="text" name="emisCode" value={formData.emisCode} onChange={handleChange}
                    className={inputClass} placeholder="EMIS code" />
                </Field>
                {isEdit && (
                  <Field label="Student Code">
                    <input type="text" name="studentCode" value={formData.studentCode}
                      className={inputClass} disabled />
                  </Field>
                )}
                <Field label="Symbol Number">
                  <input type="text" name="symbolNo" value={formData.symbolNo} onChange={handleChange}
                    className={inputClass} placeholder="Symbol number" />
                </Field>
                <Field label="Date of Birth">
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange}
                    className={inputClass} />
                </Field>
              </div>
            </div>

            {/* Family Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Family & Contact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Father's Name">
                  <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange}
                    className={inputClass} placeholder="Father's full name" />
                </Field>
                <Field label="Mother's Name">
                  <input type="text" name="motherName" value={formData.motherName} onChange={handleChange}
                    className={inputClass} placeholder="Mother's full name" />
                </Field>
                <Field label="Guardian Name">
                  <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange}
                    className={inputClass} placeholder="Guardian's full name" />
                </Field>
                <Field label="Mobile Number">
                  <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange}
                    className={inputClass} placeholder="Mobile number" />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Address">
                  <textarea name="address" value={formData.address} onChange={handleChange}
                    rows="3" className={inputClass} placeholder="Student's home address" />
                </Field>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : isEdit ? 'Update Student' : 'Add Student'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/students')}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default AddEditStudent;
