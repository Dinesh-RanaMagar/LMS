import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { studentAPI } from '../services/api';
import {
  ArrowLeft,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FileWarning,
  Upload,
  XCircle,
} from 'lucide-react';

const makeFormData = (file, mapping, classMap, dateFormat, classMapConfirmed, approvedReviewRows = []) => {
  const formData = new FormData();
  formData.append('file', file);
  if (mapping) formData.append('mapping', JSON.stringify(mapping));
  if (classMap) formData.append('classMap', JSON.stringify(classMap));
  if (dateFormat) formData.append('dateFormat', dateFormat);
  if (classMapConfirmed) formData.append('classMapConfirmed', 'true');
  formData.append('approvedReviewRows', JSON.stringify(approvedReviewRows));
  return formData;
};

const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const BulkImportStudents = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [classMap, setClassMap] = useState({});
  const [dateFormat, setDateFormat] = useState('');
  const [classMappingsConfirmed, setClassMappingsConfirmed] = useState(false);
  const [needsValidation, setNeedsValidation] = useState(false);
  const [approvedReviewRows, setApprovedReviewRows] = useState([]);
  const [result, setResult] = useState(null);

  const classSources = useMemo(() => Object.keys(preview?.suggestedClassMap || {}), [preview]);
  const mappedDob = Object.values(mapping).includes('dob');
  const mappedDobHeader = Object.entries(mapping).find(([, field]) => field === 'dob')?.[0] || '';
  const normalizedDobHeader = mappedDobHeader.toLowerCase().replace(/[^a-z0-9]/g, '');
  const selectedDateFormatSuggestion = normalizedDobHeader.endsWith('bs')
    ? 'BS'
    : normalizedDobHeader.endsWith('ad') ? 'AD' : '';
  const requiresDateFormat = mappedDob && !selectedDateFormatSuggestion;
  const approvedRowSet = useMemo(() => new Set(approvedReviewRows), [approvedReviewRows]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    setError('');
    setPreview(null);
    setResult(null);
    setMapping({});
    setClassMap({});
    setDateFormat('');
    setClassMappingsConfirmed(false);
    setNeedsValidation(false);
    setApprovedReviewRows([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!/\.(xlsx|xls|csv)$/i.test(selectedFile.name)) {
      setFile(null);
      setError('Choose an .xlsx, .xls, or .csv file.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError('The file must be 10 MB or smaller.');
      return;
    }
    setFile(selectedFile);
  };

  const requestPreview = async (selectedMapping = mapping, selectedClassMap = classMap, selectedDateFormat = dateFormat) => {
    if (!file) return;
    try {
      setLoading(true);
      setError('');
      setResult(null);
      const response = await studentAPI.previewImport(
        makeFormData(file, selectedMapping, selectedClassMap, selectedDateFormat),
      );
      setPreview(response.data);
      setMapping(response.data.mapping);
      setClassMap(response.data.classMap);
      setDateFormat(response.data.dateFormatSuggestion || '');
      setApprovedReviewRows([]);
      setClassMappingsConfirmed(false);
      setNeedsValidation(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not read the file. Check its format and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !preview || !classMappingsConfirmed || needsValidation) return;
    const rowsToImport = [
      ...preview.rows.filter((row) => row.status === 'ready').map((row) => row.rowNumber),
      ...approvedReviewRows,
    ];
    if (!rowsToImport.length) {
      setError('There are no valid or approved rows to import.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await studentAPI.importExcel(
        makeFormData(file, mapping, classMap, dateFormat, classMappingsConfirmed, approvedReviewRows),
      );
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import students.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const rowsByNumber = new Map((preview?.rows || []).map((row) => [row.rowNumber, row]));
    const lines = [
      ['Row', 'Reason', 'Student name', 'Registration number', 'Symbol number', 'Class', 'Section', 'Academic year'],
      ...(result.errors || []).map((item) => {
        const fields = rowsByNumber.get(item.row)?.fields || {};
        return [
          item.row,
          item.reason,
          fields.name,
          fields.registrationNo,
          fields.symbolNo,
          fields.className,
          fields.section,
          fields.academicYear,
        ];
      }),
    ];
    const csv = lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_import_report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = async () => {
    try {
      setDownloading(true);
      setError('');
      const response = await studentAPI.downloadImportTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.ms-excel',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student_registration_template.xls';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download the Excel template.');
    } finally {
      setDownloading(false);
    }
  };

  const toggleReviewApproval = (rowNumber) => {
    setApprovedReviewRows((current) => current.includes(rowNumber)
      ? current.filter((value) => value !== rowNumber)
      : [...current, rowNumber]);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <button
              onClick={() => navigate('/students')}
              className="mb-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft size={17} />
              Back to Students
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Student Registration</h1>
            <p className="mt-1 text-sm text-gray-500">Upload your school CSV or Excel roster, review the mapped student details, then register the validated students.</p>
          </div>
          <button
            onClick={downloadExcelTemplate}
            disabled={downloading}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <Download size={18} />
            {downloading ? 'Preparing...' : 'Download .XLS Excel Template'}
          </button>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FileSpreadsheet size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">1. Upload registration CSV or Excel</h2>
              <p className="mb-4 text-sm text-gray-500">
                Accepts .xlsx, .xls, or .csv files up to 10 MB and 10,000 student rows.
                Existing students are never overwritten.
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {file && <p className="mt-3 break-all text-sm text-gray-600">Selected: <strong>{file.name}</strong></p>}
              <button
                onClick={() => requestPreview()}
                disabled={!file || loading}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <span className="spinner" /> : <Upload size={18} />}
                {preview ? 'Validate & Refresh Preview' : 'Read File & Preview'}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <XCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {preview && !result && (
          <>
            <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">2. Map spreadsheet columns</h2>
              <p className="mb-4 text-sm text-gray-500">Review the automatic matches. Leave unrelated legacy columns unmapped.</p>
              {preview.academicYearFallback && (
                <p className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                  No academic-year column was found. This is okay—new enrollments will use the active year, <strong>{preview.academicYearFallback}</strong>. You can continue with the class mappings and preview.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {preview.headers.map((header) => (
                  <label key={header} className="flex min-w-0 flex-col gap-1 text-sm">
                    <span className="truncate font-medium text-gray-700">{header}</span>
                    <select
                      value={mapping[header] || ''}
                      onChange={(event) => {
                        setMapping((current) => ({ ...current, [header]: event.target.value }));
                        setDateFormat('');
                        setClassMappingsConfirmed(false);
                        setNeedsValidation(true);
                      }}
                      className="input-field"
                    >
                      <option value="">Ignore this column</option>
                      {preview.fields.map((field) => (
                        <option key={field.key} value={field.key}>{field.label}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {requiresDateFormat && (
                <label className="mt-5 block max-w-sm text-sm font-medium text-gray-700">
                  Date format for the mapped date column
                  <select
                    value={dateFormat}
                    onChange={(event) => {
                      setDateFormat(event.target.value);
                      setNeedsValidation(true);
                    }}
                    className="input-field mt-1"
                  >
                    <option value="">Choose BS or AD</option>
                    <option value="AD">AD (Gregorian)</option>
                    <option value="BS">BS (preserve as original text)</option>
                  </select>
                </label>
              )}
              {classSources.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-1 font-semibold text-gray-800">3. Confirm class names</h3>
                  <p className="mb-3 text-sm text-gray-500">Map legacy names such as ONE to classes configured in this website.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {classSources.map((source) => (
                      <label key={source} className="flex items-center gap-3 text-sm">
                        <span className="w-28 shrink-0 truncate text-gray-700">{source}</span>
                        <select
                          value={classMap[source] || ''}
                          onChange={(event) => {
                            setClassMap((current) => ({ ...current, [source]: event.target.value }));
                            setClassMappingsConfirmed(false);
                            setNeedsValidation(true);
                          }}
                          className="input-field"
                        >
                          <option value="">Choose configured class</option>
                          {preview.classes.map(({ className }) => (
                            <option key={className} value={className}>{className}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={classMappingsConfirmed}
                      disabled={needsValidation}
                      onChange={(event) => setClassMappingsConfirmed(event.target.checked)}
                      className="mt-1"
                    />
                    I reviewed and confirm these class mappings.
                  </label>
                </div>
              )}
              {classSources.length === 0 && (
                <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={classMappingsConfirmed}
                    disabled={needsValidation}
                    onChange={(event) => setClassMappingsConfirmed(event.target.checked)}
                    className="mt-1"
                  />
                  I confirm the class names in this file match configured classes.
                </label>
              )}
            </section>

            <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900">4. Validate and review rows</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {preview.nonEmptyRows} non-empty rows; {preview.blankRows} blank rows ignored.
                  Invalid and duplicate rows will not be imported.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Ready', preview.counts.ready, 'text-emerald-700'],
                    ['Possible matches', preview.counts.review, 'text-amber-700'],
                    ['Duplicates', preview.counts.duplicate, 'text-orange-700'],
                    ['Invalid', preview.counts.invalid, 'text-red-700'],
                  ].map(([label, count, color]) => (
                    <div key={label} className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`mt-1 text-xl font-bold ${color}`}>{count}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="max-h-[32rem] overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Class / Section</th>
                      <th className="px-4 py-3">Year / Roll</th>
                      <th className="px-4 py-3">Status / review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.rows.map((row) => (
                      <tr key={row.rowNumber} className="align-top">
                        <td className="whitespace-nowrap px-4 py-3">{row.rowNumber}</td>
                        <td className="min-w-40 px-4 py-3">{row.fields.name || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.fields.className || '—'} / {row.fields.section || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.fields.academicYear || '—'} / {row.fields.rollNo ?? '—'}</td>
                        <td className="min-w-64 px-4 py-3">
                          <span className={`font-semibold ${
                            row.status === 'ready' ? 'text-emerald-700'
                              : row.status === 'review' ? 'text-amber-700'
                                : row.status === 'duplicate' ? 'text-orange-700' : 'text-red-700'
                          }`}>{row.status}</span>
                          {row.issues.map((issue) => <p key={issue} className="mt-1 text-xs text-gray-600">{issue}</p>)}
                          {row.possibleMatch && (
                            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                              Existing match: {row.possibleMatch.name || 'Student'}
                              {row.possibleMatch.className && ` · ${row.possibleMatch.className}`}
                              {row.possibleMatch.section && `-${row.possibleMatch.section}`}
                              {row.possibleMatch.academicYear && ` · ${row.possibleMatch.academicYear}`}
                              {row.possibleMatch.rollNo != null && ` · Roll ${row.possibleMatch.rollNo}`}
                              {row.possibleMatch.registrationNo && ` · Reg ${row.possibleMatch.registrationNo}`}
                              {row.possibleMatch.symbolNo && ` · Symbol ${row.possibleMatch.symbolNo}`}
                            </p>
                          )}
                          {row.status === 'review' && (
                            <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={approvedRowSet.has(row.rowNumber)}
                                onChange={() => toggleReviewApproval(row.rowNumber)}
                              />
                              I reviewed this row; import without updating any existing student.
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <p className="text-sm text-gray-500">No database changes happen until you confirm the import.</p>
                <button
                  onClick={handleImport}
                  disabled={loading || needsValidation || !classMappingsConfirmed || (!preview.counts.ready && !approvedReviewRows.length)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <span className="spinner" /> : <Upload size={18} />}
                  {loading ? 'Importing...' : `Confirm & Import ${preview.counts.ready + approvedReviewRows.length} rows`}
                </button>
              </div>
            </section>
          </>
        )}

        {result && (
          <section className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <CheckCircle size={22} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold">Import report</h2>
                <p className="mt-1 text-sm">Added {result.insertedCount} new students. Existing records were not updated or deleted.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Spreadsheet rows', result.totalRows],
                ['Blank rows', result.blankRows],
                ['Imported', result.insertedCount],
                ['Duplicates', result.duplicateCount],
                ['Invalid', result.invalidCount],
                ['Review skipped', result.reviewCount],
              ].map(([label, count]) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
                </div>
              ))}
            </div>
            {result.errors?.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">Skipped or failed rows</h3>
                    <p className="text-sm text-gray-500">Download the row numbers and reasons to review them later.</p>
                  </div>
                  <button
                    onClick={downloadReport}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <Download size={17} />
                    Download CSV report
                  </button>
                </div>
                <div className="space-y-2">
                  {result.errors.slice(0, 100).map((item, index) => (
                    <p key={`${item.row}-${index}`} className="flex gap-2 text-sm text-gray-700">
                      <FileWarning size={16} className="mt-0.5 shrink-0 text-amber-600" />
                      <span><strong>Row {item.row}:</strong> {item.reason}</span>
                    </p>
                  ))}
                  {result.errors.length > 100 && <p className="text-sm text-gray-500">Showing first 100 rows; download the report for the full list.</p>}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
};

export default BulkImportStudents;
