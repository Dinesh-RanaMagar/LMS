import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import { classAPI, examAPI, marksheetAPI, settingsAPI } from '../services/api';
import { formatDecimal } from '../utils/numberFormat';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const xmlCell = (value, styleId, mergeAcross = 0) => {
  const type = typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String';
  const text = String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[character]));
  const merge = mergeAcross ? ` ss:MergeAcross="${mergeAcross}"` : '';
  return `<Cell ss:StyleID="${styleId}"${merge}><Data ss:Type="${type}">${text}</Data></Cell>`;
};

const displayFormats = [
  { value: 'raw', label: 'Raw Marks' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'gpa', label: 'GPA' },
  { value: 'grade', label: 'Grade' },
  { value: 'result', label: 'Pass / Fail' },
];

const getSubjectConfig = (exam, className) =>
  exam?.classExamConfigs?.find((config) => config.className === className)?.subjects || [];

const getSubjectMark = (marksheet, subjectName) =>
  marksheet.marks?.find((mark) => mark.subject === subjectName);

const getFailedSubjectCount = (marksheet, subjectConfigs) =>
  subjectConfigs.reduce((count, config) => {
    const mark = getSubjectMark(marksheet, config.subjectName);
    if (!mark) return count + 1;
    const hasPractical = Boolean(mark.hasPractical || config.hasPractical);
    const failed = hasPractical
      ? Number(mark.theory || 0) < Number(config.theoryPassMarks ?? mark.theoryPassMarks ?? 0)
        || Number(mark.practical || 0) < Number(config.practicalPassMarks ?? mark.practicalPassMarks ?? 0)
      : Number(mark.obtainedMarks ?? (Number(mark.theory || 0) + Number(mark.practical || 0))) < Number(config.passMarks ?? mark.passMarks ?? 0);
    return count + Number(failed);
  }, 0);

const getSubjectFormatValues = (marksheet, subject, format) => {
  const mark = getSubjectMark(marksheet, subject.subjectName);
  if (!mark) return format === 'raw' ? ['-', '-', '-'] : ['-'];

  const obtained = Number(mark.obtainedMarks ?? (Number(mark.theory || 0) + Number(mark.practical || 0)));
  if (format === 'raw') return [mark.theory ?? 0, mark.practical ?? 0, obtained];

  const fullMarks = Number(subject.fullMarks ?? mark.fullMarks ?? 0);
  const percentage = fullMarks ? (obtained / fullMarks) * 100 : 0;
  if (format === 'percentage') return [`${formatDecimal(percentage)}%`];
  if (format === 'gpa') {
    const gradePoint = mark.gradePoint ?? (
      percentage >= 90 ? 4
        : percentage >= 80 ? 3.6
          : percentage >= 70 ? 3.2
            : percentage >= 60 ? 2.8
              : percentage >= 50 ? 2.4
                : percentage >= 40 ? 2
                  : 0
    );
    return [formatDecimal(gradePoint)];
  }
  if (format === 'grade') {
    const grade = mark.grade || (
      percentage >= 90 ? 'A+'
        : percentage >= 80 ? 'A'
          : percentage >= 70 ? 'B+'
            : percentage >= 60 ? 'B'
              : percentage >= 50 ? 'C'
                : percentage >= 40 ? 'D'
                  : 'F'
    );
    return [grade];
  }

  const hasPractical = Boolean(mark.hasPractical || subject.hasPractical);
  const passed = hasPractical
    ? Number(mark.theory || 0) >= Number(subject.theoryPassMarks ?? mark.theoryPassMarks ?? 0)
      && Number(mark.practical || 0) >= Number(subject.practicalPassMarks ?? mark.practicalPassMarks ?? 0)
    : obtained >= Number(subject.passMarks ?? mark.passMarks ?? 0);
  return [passed ? 'Pass' : 'Fail'];
};

const getRollNumber = (marksheet) => marksheet.student?.rollNo ?? '';
const getAdmissionNumber = (student) => student?.emisCode || student?.studentCode || student?.symbolNo || '';

const TabulationReport = () => {
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [marksheets, setMarksheets] = useState([]);
  const [settings, setSettings] = useState(null);
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [examId, setExamId] = useState('');
  const [displayFormat, setDisplayFormat] = useState('raw');
  const [includeUnpublished, setIncludeUnpublished] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [classResponse, examResponse, settingsResponse] = await Promise.all([
          classAPI.getAll(),
          examAPI.getAll(),
          settingsAPI.get(),
        ]);
        setClasses(classResponse.data?.classes || []);
        setExams(examResponse.data?.exams || []);
        setSettings(settingsResponse.data?.settings || null);
      } catch (loadError) {
        console.error('Unable to load tabulation options:', loadError);
        setError(loadError.response?.data?.message || 'Unable to load classes and exams.');
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  const selectedClass = classes.find((item) => item.className === className);
  const sections = [...(selectedClass?.sections || [])].sort(collator.compare);
  const availableExams = exams
    .filter((exam) =>
      exam.classExamConfigs?.some((config) => config.className === className)
      || exam.applicableClasses?.includes(className)
      || (exam.classSelectionMode === 'allClasses' && className)
    )
    .sort((first, second) => collator.compare(first.examName || '', second.examName || ''));
  const selectedExam = availableExams.find((exam) => exam._id === examId);
  const subjectConfigs = getSubjectConfig(selectedExam, className);
  const sortedSubjectConfigs = subjectConfigs;

  useEffect(() => {
    let active = true;
    const loadMarksheets = async () => {
      setMarksheets([]);
      setError('');
      setNotice('');
      if (!examId) return;
      setLoadingMarks(true);
      try {
        const params = { examId, className };
        if (includeUnpublished) params.includeUnpublished = true;
        const response = await marksheetAPI.getAll(params);
        if (active) setMarksheets(response.data?.marksheets || []);
      } catch (loadError) {
        console.error('Unable to load tabulation marks:', loadError);
        if (active) setError(loadError.response?.data?.message || 'Unable to load marks for this exam.');
      } finally {
        if (active) setLoadingMarks(false);
      }
    };
    loadMarksheets();
    return () => { active = false; };
  }, [examId, className, includeUnpublished]);

  const classRows = marksheets;
  const sectionRows = section
    ? classRows.filter((marksheet) => marksheet.student?.section === section)
    : classRows;
  const rankStudents = (students) => {
    const rankedStudents = [...students].sort((first, second) =>
      Number(second.percentage || 0) - Number(first.percentage || 0)
      || collator.compare(first.student?.name || '', second.student?.name || '')
    );
    return new Map(rankedStudents.map((marksheet, index) => [marksheet._id, index + 1]));
  };
  const classRankById = rankStudents(classRows);
  const sectionRankById = new Map();
  const rowsBySection = new Map();
  classRows.forEach((marksheet) => {
    const sectionName = marksheet.student?.section || '';
    rowsBySection.set(sectionName, [...(rowsBySection.get(sectionName) || []), marksheet]);
  });
  rowsBySection.forEach((students) => {
    rankStudents(students).forEach((rank, id) => sectionRankById.set(id, rank));
  });
  const reportRows = [...sectionRows].sort((first, second) => {
    const firstRoll = getRollNumber(first);
    const secondRoll = getRollNumber(second);
    if (firstRoll !== '' && secondRoll !== '') {
      const numericDifference = Number(firstRoll) - Number(secondRoll);
      if (Number.isFinite(numericDifference) && numericDifference !== 0) return numericDifference;
      const rollDifference = collator.compare(String(firstRoll), String(secondRoll));
      if (rollDifference) return rollDifference;
    } else if (firstRoll !== '') return -1;
    else if (secondRoll !== '') return 1;
    return collator.compare(first.student?.name || '', second.student?.name || '');
  }).map((marksheet) => ({
    marksheet,
    classRank: classRankById.get(marksheet._id),
    sectionRank: sectionRankById.get(marksheet._id),
    failedSubjects: getFailedSubjectCount(marksheet, subjectConfigs),
  }));
  const summary = {
    total: reportRows.length,
    passed: reportRows.filter(({ marksheet }) => marksheet.result === 'Pass').length,
    failed: reportRows.filter(({ marksheet }) => marksheet.result !== 'Pass').length,
  };

  const getExportData = () => {
    const headers = ['R.N.', 'Student Name', 'Admission No.'];
    sortedSubjectConfigs.forEach((subject) => {
      if (displayFormat === 'raw') {
        headers.push(`${subject.subjectName} TH`, `${subject.subjectName} INT`, `${subject.subjectName} Total`);
      } else {
        headers.push(`${subject.subjectName} ${displayFormats.find((format) => format.value === displayFormat)?.label || ''}`);
      }
    });
    headers.push('Total Obtained', 'Full Marks', 'Percentage', 'Rank in Class', 'Rank in Section', 'Failed Subjects', 'Grade', 'GPA', 'Result');

    const rows = reportRows.map(({ marksheet, classRank, sectionRank, failedSubjects }) => {
      const values = [getRollNumber(marksheet), marksheet.student?.name, getAdmissionNumber(marksheet.student)];
      sortedSubjectConfigs.forEach((subject) => {
        values.push(...getSubjectFormatValues(marksheet, subject, displayFormat));
      });
      values.push(
        marksheet.totalMarks,
        marksheet.totalFullMarks,
        `${formatDecimal(marksheet.percentage, '0.00')}%`,
        classRank,
        sectionRank,
        failedSubjects,
        marksheet.grade,
        formatDecimal(marksheet.gpa, '0.00'),
        marksheet.result
      );
      return values;
    });
    return [headers, ...rows];
  };

  const downloadCsv = () => {
    if (!selectedExam || !reportRows.length) {
      setError('Select a class, exam, and section with marks before downloading.');
      return;
    }
    const csv = getExportData().map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = `${className}-${section || 'all-sections'}-${selectedExam.examName}`
      .replace(/[^a-z0-9_-]+/gi, '_');
    link.href = url;
    link.download = `${safeName}-tabulation.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setError('');
    setNotice('Tabulation CSV downloaded.');
  };

  const downloadExcel = () => {
    if (!selectedExam || !reportRows.length) {
      setError('Select a class, exam, and section with marks before downloading.');
      return;
    }

    try {
      const exportData = getExportData();
      const columnCount = exportData[0].length;
      const metadataRows = [
        { value: settings?.schoolName || 'School', style: 'SchoolTitle', height: 34 },
        { value: `Tabulation of Class ${className}${section ? ` - Section ${section}` : ''} | ${selectedExam.examName}`, style: 'ReportTitle', height: 30 },
        { value: selectedExam.academicYear || '', style: 'Metadata', height: 24 },
        { value: `Students: ${summary.total}   Passed: ${summary.passed}   Failed: ${summary.failed}`, style: 'Summary', height: 26 },
      ];
      const titleRows = metadataRows.map(({ value, style, height }) =>
        `<Row ss:Height="${height}">${xmlCell(value, style, columnCount - 1)}</Row>`
      ).join('');
      const spacerRow = '<Row ss:Height="8"/>';
      const tableRows = exportData.map((row, rowIndex) =>
        `<Row ss:Height="${rowIndex === 0 ? 34 : 28}">${row.map((value) => xmlCell(
          value,
          rowIndex === 0 ? 'Header' : rowIndex % 2 === 0 ? 'EvenRow' : 'Body'
        )).join('')}</Row>`
      ).join('');
      const worksheetColumns = exportData[0].map((header, index) => {
        const width = index === 1
          ? 210
          : Math.min(Math.max(String(header).length * 8 + 30, 78), 190);
        return `<Column ss:Width="${width}"/>`;
      }).join('');
      const workbook = `<?xml version="1.0"?>
        <?mso-application progid="Excel.Sheet"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
          <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
            <Title>${escapeHtml(`${selectedExam.examName} Tabulation`)}</Title>
            <Subject>${escapeHtml(`${className}${section ? ` - Section ${section}` : ''}`)}</Subject>
            <Author>${escapeHtml(settings?.schoolName || 'School Management System')}</Author>
          </DocumentProperties>
          <Styles>
            <Style ss:ID="SchoolTitle">
              <Font ss:FontName="Arial" ss:Size="18" ss:Bold="1" ss:Color="#1E1B4B"/>
              <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            </Style>
            <Style ss:ID="ReportTitle">
              <Font ss:FontName="Arial" ss:Size="15" ss:Bold="1" ss:Color="#111827"/>
              <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            </Style>
            <Style ss:ID="Metadata">
              <Font ss:FontName="Arial" ss:Size="13" ss:Bold="1" ss:Color="#334155"/>
              <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            </Style>
            <Style ss:ID="Summary">
              <Font ss:FontName="Arial" ss:Size="14" ss:Bold="1" ss:Color="#111827"/>
              <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            </Style>
            <Style ss:ID="Header">
              <Font ss:FontName="Arial" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/>
              <Interior ss:Color="#3F31B6" ss:Pattern="Solid"/>
              <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
              <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#282078"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8B8C8"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8B8C8"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8B8C8"/>
              </Borders>
            </Style>
            <Style ss:ID="Body">
              <Font ss:FontName="Arial" ss:Size="14" ss:Bold="1" ss:Color="#111827"/>
              <Alignment ss:Vertical="Center" ss:WrapText="1"/>
              <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
              </Borders>
            </Style>
            <Style ss:ID="EvenRow" ss:Parent="Body">
              <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
            </Style>
          </Styles>
          <Worksheet ss:Name="Tabulation">
            <Table>${worksheetColumns}${titleRows}${spacerRow}${tableRows}</Table>
            <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
              <FreezePanes/>
              <FrozenNoSplit/>
              <SplitHorizontal>6</SplitHorizontal>
              <TopRowBottomPane>6</TopRowBottomPane>
              <ActivePane>2</ActivePane>
            </WorksheetOptions>
          </Worksheet>
        </Workbook>`;
      const safeName = `${className}-${section || 'all-sections'}-${selectedExam.examName}`
        .replace(/[^a-z0-9_-]+/gi, '_');
      const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-tabulation.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError('');
      setNotice('Tabulation Excel file downloaded.');
    } catch (exportError) {
      console.error('Unable to export tabulation to Excel:', exportError);
      setError('Unable to create the Excel file. Please try again.');
    }
  };

  const printReport = () => {
    if (!selectedExam || !reportRows.length) {
      setError('Select a class, exam, and section with marks before printing.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      setError('The print window was blocked. Allow pop-ups and try again.');
      return;
    }
    const printHeader = `<tr>
      <th rowspan="2">R.N.</th><th rowspan="2">Student Name</th><th rowspan="2">Admission No.</th>
      ${sortedSubjectConfigs.map((subject) => `<th colspan="${displayFormat === 'raw' ? 3 : 1}"${displayFormat === 'raw' ? '' : ' rowspan="2"'}>${escapeHtml(subject.subjectName)}${displayFormat === 'raw' ? '' : ` ${escapeHtml(displayFormats.find((format) => format.value === displayFormat)?.label || '')}`}</th>`).join('')}
      <th rowspan="2">Total</th><th rowspan="2">%</th><th rowspan="2">Rank in Class</th><th rowspan="2">Rank in Section</th>
      <th rowspan="2">Failed</th><th rowspan="2">Grade</th><th rowspan="2">GPA</th><th rowspan="2">Result</th>
    </tr>${displayFormat === 'raw' ? `<tr>${sortedSubjectConfigs.map(() => '<th>TH</th><th>INT</th><th>Total</th>').join('')}</tr>` : ''}`;
    const rows = reportRows.map(({ marksheet, classRank, sectionRank, failedSubjects }) => {
      const cells = [getRollNumber(marksheet), marksheet.student?.name, getAdmissionNumber(marksheet.student)];
      sortedSubjectConfigs.forEach((subject) => {
        cells.push(...getSubjectFormatValues(marksheet, subject, displayFormat));
      });
      cells.push(
        `${marksheet.totalMarks ?? 0}/${marksheet.totalFullMarks ?? 0}`,
        `${formatDecimal(marksheet.percentage, '0.00')}%`,
        classRank,
        sectionRank,
        failedSubjects,
        marksheet.grade || '-',
        formatDecimal(marksheet.gpa, '0.00'),
        marksheet.result || '-'
      );
      return `<tr>${cells.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`;
    }).join('');

    printWindow.document.write(`<!doctype html><html><head><title>Tabulation - ${escapeHtml(selectedExam.examName)}</title>
      <style>
        @page { size: A3 landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11pt; }
        h1, h2, p { text-align: center; margin: 4px 0; }
        h1 { font-size: 22pt; } h2 { font-size: 15pt; margin: 14px 0 8px; }
        .summary { margin: 10px 0; text-align: center; font-size: 11pt; font-weight: 600; }
        table { border-collapse: collapse; width: 100%; table-layout: auto; font-size: 10pt; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        th, td { border: 1px solid #64748b; padding: 6px 5px; text-align: center; vertical-align: middle; }
        th { background: #e8e7f8; color: #1e1b4b; font-size: 9.5pt; font-weight: 700; }
        tbody tr:nth-child(even) { background: #f1f5f9; }
        td:nth-child(2) { text-align: left; font-weight: 600; }
        @media screen { body { padding: 20px; } }
      </style></head><body>
        <h1>${escapeHtml(settings?.schoolName || 'School')}</h1>
        <p>${escapeHtml(settings?.address || '')}</p>
        <h2>Tabulation of ${escapeHtml(className)}${section ? ` - Section ${escapeHtml(section)}` : ''} | ${escapeHtml(selectedExam.examName)}</h2>
        <p>${escapeHtml(selectedExam.academicYear || '')}</p>
        <div class="summary">Students: ${summary.total} &nbsp; Passed: ${summary.passed} &nbsp; Failed: ${summary.failed}</div>
        <table><thead>${printHeader}</thead><tbody>${rows}</tbody></table>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Tabulation Report</h1>
            <p className="mt-1 text-sm text-slate-500">Review class results and download or print an exam tabulation.</p>
          </div>

          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-slate-600">
                Class
                <select className={`${inputClass} mt-1.5`} value={className} onChange={(event) => {
                  setClassName(event.target.value);
                  setSection('');
                  setExamId('');
                }} disabled={loadingOptions}>
                  <option value="">Select class</option>
                  {[...classes].sort((first, second) =>
                    (Number(first.order) || 0) - (Number(second.order) || 0)
                    || collator.compare(first.className || '', second.className || '')
                  ).map((item) => <option key={item._id} value={item.className}>{item.className}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Exam
                <select className={`${inputClass} mt-1.5`} value={examId} onChange={(event) => setExamId(event.target.value)} disabled={!className || loadingOptions}>
                  <option value="">Select exam</option>
                  {availableExams.map((exam) => <option key={exam._id} value={exam._id}>{exam.examName}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Section
                <select className={`${inputClass} mt-1.5`} value={section} onChange={(event) => setSection(event.target.value)} disabled={!className}>
                  <option value="">All sections</option>
                  {sections.map((item) => <option key={item} value={item}>Section {item}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Display format
                <select className={`${inputClass} mt-1.5`} value={displayFormat} onChange={(event) => setDisplayFormat(event.target.value)}>
                  {displayFormats.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={includeUnpublished} onChange={(event) => setIncludeUnpublished(event.target.checked)} />
                Include unpublished marks
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                {selectedExam ? `${selectedExam.examName} · ${className}${section ? ` · Section ${section}` : ' · All sections'}` : 'Choose a class and exam to view tabulation.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={downloadExcel} disabled={!reportRows.length || loadingMarks} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                  <FileSpreadsheet size={16} /> Download Excel
                </button>
                <button type="button" onClick={downloadCsv} disabled={!reportRows.length || loadingMarks} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Download size={16} /> Download CSV
                </button>
                <button type="button" onClick={printReport} disabled={!reportRows.length || loadingMarks} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Printer size={16} /> Print / Save as PDF
                </button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loadingMarks ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><RefreshCw size={18} className="animate-spin" /> Loading marks...</div>
            ) : !examId ? (
              <div className="py-16 text-center text-slate-500"><FileSpreadsheet size={38} className="mx-auto mb-3 text-slate-300" /><p>Select an exam to generate the report.</p></div>
            ) : reportRows.length === 0 ? (
              <div className="py-16 text-center text-slate-500"><FileSpreadsheet size={38} className="mx-auto mb-3 text-slate-300" /><p>No tabulation data found for this class, exam, and section.</p><p className="mt-1 text-xs text-slate-400">{includeUnpublished ? 'Check that marks have been entered for this class and exam.' : 'If marks have been entered but results are unpublished, enable “Include unpublished marks”.'}</p></div>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-100 px-5 py-3 text-sm">
                  <span><strong>{summary.total}</strong> students</span>
                  <span className="text-emerald-700"><strong>{summary.passed}</strong> passed</span>
                  <span className="text-red-700"><strong>{summary.failed}</strong> failed</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">R.N.</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-left text-sm font-bold">Name</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">Admission No.</th>
                        {sortedSubjectConfigs.map((subject) => (
                          <th
                            key={subject.subjectName}
                            colSpan={displayFormat === 'raw' ? 3 : 1}
                            rowSpan={displayFormat === 'raw' ? 1 : 2}
                            className="border border-slate-200 px-3 py-2 text-sm font-bold"
                          >
                            {subject.subjectName}
                          </th>
                        ))}
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">Total</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">%</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">Rank in Class</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">Rank in Section</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">Failed</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">Grade</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">GPA</th>
                        <th rowSpan={displayFormat === 'raw' ? 2 : 1} className="border border-slate-200 px-3 py-2 text-sm font-bold">Result</th>
                      </tr>
                      {displayFormat === 'raw' && (
                        <tr>{sortedSubjectConfigs.flatMap((subject) => [
                          <th key={`${subject.subjectName}-th`} className="border border-slate-200 px-2 py-1.5 text-xs font-bold">TH</th>,
                          <th key={`${subject.subjectName}-pr`} className="border border-slate-200 px-2 py-1.5 text-xs font-bold">INT</th>,
                          <th key={`${subject.subjectName}-total`} className="border border-slate-200 px-2 py-1.5 text-xs font-bold">Total</th>,
                        ])}</tr>
                      )}
                    </thead>
                    <tbody>
                      {reportRows.map(({ marksheet, classRank, sectionRank, failedSubjects }, index) => (
                        <tr key={marksheet._id} className={index % 2 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-100 px-3 py-2.5 text-center tabular-nums">{getRollNumber(marksheet) || index + 1}</td>
                          <td className="border border-slate-100 px-3 py-2.5 font-medium">{marksheet.student?.name || '-'}</td>
                          <td className="border border-slate-100 px-3 py-2.5 text-center tabular-nums">{getAdmissionNumber(marksheet.student) || '-'}</td>
                          {sortedSubjectConfigs.flatMap((subject) =>
                            getSubjectFormatValues(marksheet, subject, displayFormat).map((value, valueIndex) => (
                              <td key={`${subject.subjectName}-${displayFormat}-${valueIndex}`} className="border border-slate-100 px-2 py-2.5 text-center tabular-nums">
                                {value}
                              </td>
                            ))
                          )}
                          <td className="border border-slate-100 px-2 py-2 text-center font-semibold">{marksheet.totalMarks}/{marksheet.totalFullMarks}</td>
                          <td className="border border-slate-100 px-2 py-2 text-center">{formatDecimal(marksheet.percentage, '0.00')}%</td>
                          <td className="border border-slate-100 px-2 py-2 text-center">{classRank}</td>
                          <td className="border border-slate-100 px-2 py-2 text-center">{sectionRank}</td>
                          <td className="border border-slate-100 px-2 py-2 text-center">{failedSubjects}</td>
                          <td className="border border-slate-100 px-2 py-2 text-center">{marksheet.grade || '-'}</td>
                          <td className="border border-slate-100 px-2 py-2 text-center">{formatDecimal(marksheet.gpa, '0.00')}</td>
                          <td className={`border border-slate-100 px-2 py-2 text-center font-medium ${marksheet.result === 'Pass' ? 'text-emerald-700' : 'text-red-700'}`}>{marksheet.result || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default TabulationReport;
