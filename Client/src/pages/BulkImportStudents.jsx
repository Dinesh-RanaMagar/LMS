import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { studentAPI } from '../services/api';
import { ArrowLeft, Download, Upload, FileSpreadsheet, XCircle, CheckCircle } from 'lucide-react';

const BulkImportStudents = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    setResult(null);
    setError('');

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isExcelFile = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
    if (!isExcelFile) {
      setFile(null);
      setError('Please select only .xlsx or .xls Excel file');
      return;
    }

    setFile(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please choose an Excel file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setError('');
      const response = await studentAPI.importExcel(formData);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import students');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcelTemplate = async () => {
    try {
      setDownloading(true);
      setError('');
      const response = await studentAPI.downloadImportTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download Excel template');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => navigate('/students')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-3"
            >
              <ArrowLeft size={17} />
              Back to Students
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Import Students</h1>
            <p className="text-gray-400 text-sm mt-1">Upload an Excel file to add many students at once.</p>
          </div>
          <button
            onClick={downloadExcelTemplate}
            disabled={downloading}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition font-medium text-sm shadow-sm disabled:opacity-60"
          >
            {downloading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download size={18} />}
            Download Excel Template
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload Excel File</h2>
              <p className="text-sm text-gray-500 mb-4">Accepted file formats are .xlsx and .xls. Required columns are name, className, section, rollNo, and academicYear.</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {file && <p className="text-sm text-gray-500 mt-3">Selected file: <span className="font-medium text-gray-800">{file.name}</span></p>}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleImport}
              disabled={loading || !file}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={18} />}
              {loading ? 'Importing...' : 'Upload / Import'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <XCircle size={18} />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-green-800 flex items-start gap-3">
              <CheckCircle size={22} className="mt-0.5" />
              <div>
                <h3 className="font-semibold">Import completed</h3>
                <p className="text-sm mt-1">Inserted {result.insertedCount} students and skipped {result.skippedCount} rows out of {result.totalRows} rows.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm text-gray-500">Total Rows</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{result.totalRows}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm text-gray-500">Inserted Count</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{result.insertedCount}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm text-gray-500">Skipped Count</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{result.skippedCount}</p>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Skipped Rows</h3>
                  <p className="text-sm text-gray-500 mt-1">Fix these rows in Excel and upload again if needed.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left px-5 py-3 font-medium">Row</th>
                        <th className="text-left px-5 py-3 font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.errors.map((item, index) => (
                        <tr key={`${item.row}-${index}`}>
                          <td className="px-5 py-3 font-medium text-gray-800">{item.row}</td>
                          <td className="px-5 py-3 text-red-600">{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BulkImportStudents;
