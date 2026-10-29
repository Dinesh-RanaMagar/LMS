import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Download, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import { classAPI, examAPI, marksheetAPI, settingsAPI } from '../services/api';

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

const xmlCell = (value, styleId, mergeAcross = 0, mergeDown = 0) => {
  const type = typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String';
  const text = String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[character]));
  const merge = `${mergeAcross ? ` ss:MergeAcross="${mergeAcross}"` : ''}${mergeDown ? ` ss:MergeDown="${mergeDown}"` : ''}`;
  return `<Cell ss:StyleID="${styleId}"${merge}><Data ss:Type="${type}">${text}</Data></Cell>`;
};

const markModes = [
  { value: 'total', label: 'Total' },
  { value: 'th', label: 'TH (Theory)' },
];

const getSubjectConfig = (exam, className) =>
  exam?.classExamConfigs?.find((config) => config.className === className)?.subjects || [];

const normalizeSubject = (value) => String(value ?? '').trim();

// TH mode reads theory marks; Total mode reads the obtained total (theory + practical).
const getMarkValue = (marksheet, subjectName, mode) => {
  const mark = marksheet?.marks?.find((item) => normalizeSubject(item.subject) === subjectName);
  if (!mark) return null;
  if (mode === 'th') return Number(mark.theory ?? 0);
  return Number(mark.obtainedMarks ?? (Number(mark.theory || 0) + Number(mark.practical || 0)));
};

const getRollNumber = (marksheet) =>
  marksheet?.student?.rollNo ?? marksheet?.student?.symbolNo ?? '';

const formatMark = (value) =>
  value == null ? '—' : String(Math.round(Number(value) * 100) / 100);

const formatDifference = (value) => {
  if (value == null) return '—';
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : ''}${rounded}`;
};

const ComparisonReport = () => {
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [settings, setSettings] = useState(null);
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [mode, setMode] = useState('total');
  const [firstExamId, setFirstExamId] = useState('');
  const [secondExamId, setSecondExamId] = useState('');
  const [firstMarksheets, setFirstMarksheets] = useState([]);
  const [secondMarksheets, setSecondMarksheets] = useState([]);
  // Unpublished exams return no rows unless this is enabled, so it defaults on.
  const [includeUnpublished, setIncludeUnpublished] = useState(true);
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
        console.error('Unable to load comparison options:', loadError);
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
  const firstExam = availableExams.find((exam) => exam._id === firstExamId);
  const secondExam = availableExams.find((exam) => exam._id === secondExamId);
  const bothExamsSelected = Boolean(firstExamId && secondExamId && className);

  useEffect(() => {
    let active = true;
    const loadMarksheets = async () => {
      setFirstMarksheets([]);
      setSecondMarksheets([]);
      setError('');
      setNotice('');
      if (!firstExamId || !secondExamId || !className) return;
      setLoadingMarks(true);
      try {
        const params = (examId) => {
          const query = { examId, className };
          if (includeUnpublished) query.includeUnpublished = true;
          return query;
        };
        const [firstResponse, secondResponse] = await Promise.all([
          marksheetAPI.getAll(params(firstExamId)),
          marksheetAPI.getAll(params(secondExamId)),
        ]);
        if (!active) return;
        setFirstMarksheets(firstResponse.data?.marksheets || []);
        setSecondMarksheets(secondResponse.data?.marksheets || []);
      } catch (loadError) {
        console.error('Unable to load comparison marks:', loadError);
        if (active) setError(loadError.response?.data?.message || 'Unable to load marks for the selected exams.');
      } finally {
        if (active) setLoadingMarks(false);
      }
    };
    loadMarksheets();
    return () => { active = false; };
  }, [firstExamId, secondExamId, className, includeUnpublished]);

  // Subjects come from the exam configuration; marksheets fill any gap when a class has no config.
  const subjectNames = [];
  const addSubject = (name) => {
    const subject = normalizeSubject(name);
    if (subject && !subjectNames.includes(subject)) subjectNames.push(subject);
  };
  [...getSubjectConfig(firstExam, className), ...getSubjectConfig(secondExam, className)]
    .forEach((config) => addSubject(config?.subjectName));
  if (subjectNames.length === 0) {
    [...firstMarksheets, ...secondMarksheets].forEach((marksheet) => {
      (marksheet.marks || []).forEach((mark) => addSubject(mark.subject));
    });
  }

  const inSection = (marksheets) =>
    section ? marksheets.filter((marksheet) => marksheet.student?.section === section) : marksheets;
  const firstScoped = inSection(firstMarksheets);
  const secondScoped = inSection(secondMarksheets);
  const firstByStudent = new Map(firstScoped.map((marksheet) => [String(marksheet.student?._id), marksheet]));
  const secondByStudent = new Map(secondScoped.map((marksheet) => [String(marksheet.student?._id), marksheet]));
  const rows = [...new Set([...firstByStudent.keys(), ...secondByStudent.keys()])]
    .map((studentId) => ({
      studentId,
      first: firstByStudent.get(studentId),
      second: secondByStudent.get(studentId),
      student: secondByStudent.get(studentId)?.student || firstByStudent.get(studentId)?.student,
    }))
    .sort((rowA, rowB) => {
      const firstRoll = getRollNumber(rowA.second || rowA.first);
      const secondRoll = getRollNumber(rowB.second || rowB.first);
      if (firstRoll !== '' && secondRoll !== '') {
        const numericDifference = Number(firstRoll) - Number(secondRoll);
        if (Number.isFinite(numericDifference) && numericDifference !== 0) return numericDifference;
      } else if (firstRoll !== '') return -1;
      else if (secondRoll !== '') return 1;
      return collator.compare(rowA.student?.name || '', rowB.student?.name || '');
    });

  const firstLabel = firstExam?.examName || 'First exam';
  const secondLabel = secondExam?.examName || 'Second exam';
  const modeLabel = markModes.find((item) => item.value === mode)?.label || '';
  const unpublishedExams = [firstExam, secondExam].filter((exam) => exam && !exam.isResultPublished);
  const hasRows = rows.length > 0 && subjectNames.length > 0;

  const getRowValues = (row, subjectName) => {
    const firstValue = getMarkValue(row.first, subjectName, mode);
    const secondValue = getMarkValue(row.second, subjectName, mode);
    const difference = firstValue != null && secondValue != null ? secondValue - firstValue : null;
    return { firstValue, secondValue, difference };
  };

  const buildDataRows = () =>
    rows.map((row) => {
      const line = [getRollNumber(row.second || row.first) || '', row.student?.name || ''];
      subjectNames.forEach((subjectName) => {
        const { firstValue, secondValue, difference } = getRowValues(row, subjectName);
        line.push(formatMark(firstValue), formatMark(secondValue), formatDifference(difference));
      });
      return line;
    });

  const fileBaseName = () =>
    `${className}-${section || 'all-sections'}-${firstExam?.examName || 'first'}-vs-${secondExam?.examName || 'second'}`
      .replace(/[^a-z0-9_-]+/gi, '_');

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadCsv = () => {
    if (!hasRows) {
      setError('Select a class and two exams with marks before downloading.');
      return;
    }
    const header = ['Roll No.', 'Name'];
    subjectNames.forEach((subjectName) => {
      header.push(`${subjectName} (${firstLabel})`, `${subjectName} (${secondLabel})`, `${subjectName} (Difference)`);
    });
    const csv = [header, ...buildDataRows()].map((row) => row.map(csvCell).join(',')).join('\r\n');
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `${fileBaseName()}-comparison.csv`);
    setError('');
    setNotice('Comparison CSV downloaded.');
  };

  const downloadExcel = () => {
    if (!hasRows) {
      setError('Select a class and two exams with marks before downloading.');
      return;
    }
    try {
      const dataRows = buildDataRows();
      const columnCount = 2 + subjectNames.length * 3;
      const titleRows = [
        { value: settings?.schoolName || 'School', style: 'SchoolTitle', height: 34 },
        { value: `Comparison of ${className}${section ? ` - Section ${section}` : ''} (${modeLabel})`, style: 'ReportTitle', height: 30 },
        { value: `${firstLabel}  vs  ${secondLabel}`, style: 'Metadata', height: 24 },
        { value: `Students: ${rows.length}   Subjects: ${subjectNames.length}`, style: 'Summary', height: 26 },
      ].map(({ value, style, height }) => `<Row ss:Height="${height}">${xmlCell(value, style, columnCount - 1)}</Row>`).join('');

      // First header row: merged subject groups. Covered cells are intentionally omitted.
      const groupCells = [
        xmlCell('Roll No.', 'Header', 0, 1),
        xmlCell('Name', 'Header', 0, 1),
        ...subjectNames.map((subjectName) => xmlCell(subjectName, 'Header', 2)),
      ].join('');
      const subCells = subjectNames
        .flatMap(() => ['First Term', 'Second Term', 'Difference'])
        .map((label) => xmlCell(label, 'Header'))
        .join('');
      const headerRows = `<Row ss:Height="32">${groupCells}</Row><Row ss:Height="28">${subCells}</Row>`;
      const tableRows = dataRows
        .map((row, rowIndex) => `<Row ss:Height="26">${row.map((value, cellIndex) => xmlCell(
          typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value,
          cellIndex < 2 ? 'BodyBold' : rowIndex % 2 === 0 ? 'Body' : 'EvenRow'
        )).join('')}</Row>`)
        .join('');

      const columns = [
        '<Column ss:Width="70"/>',
        '<Column ss:Width="210"/>',
        ...subjectNames.flatMap(() => [
          '<Column ss:Width="80"/>',
          '<Column ss:Width="80"/>',
          '<Column ss:Width="90"/>',
        ]),
      ].join('');

      const workbook = `<?xml version="1.0"?>
        <?mso-application progid="Excel.Sheet"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
          <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
            <Title>${escapeHtml(`Comparison ${className}`)}</Title>
            <Subject>${escapeHtml(`${firstLabel} vs ${secondLabel}`)}</Subject>
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
              <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
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
              <Font ss:FontName="Arial" ss:Size="12" ss:Color="#111827"/>
              <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
              <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
              </Borders>
            </Style>
            <Style ss:ID="BodyBold" ss:Parent="Body">
              <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#111827"/>
              <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
            </Style>
            <Style ss:ID="EvenRow" ss:Parent="Body">
              <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
            </Style>
          </Styles>
          <Worksheet ss:Name="Comparison">
            <Table>${columns}${titleRows}<Row ss:Height="8"/>${headerRows}${tableRows}</Table>
            <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
              <FreezePanes/>
              <FrozenNoSplit/>
              <SplitHorizontal>6</SplitHorizontal>
              <TopRowBottomPane>6</TopRowBottomPane>
              <ActivePane>2</ActivePane>
            </WorksheetOptions>
          </Worksheet>
        </Workbook>`;
      downloadBlob(new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${fileBaseName()}-comparison.xls`);
      setError('');
      setNotice('Comparison Excel file downloaded.');
    } catch (exportError) {
      console.error('Unable to export comparison to Excel:', exportError);
      setError('Unable to create the Excel file. Please try again.');
    }
  };

  const printReport = () => {
    if (!hasRows) {
      setError('Select a class and two exams with marks before printing.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      setError('The print window was blocked. Allow pop-ups and try again.');
      return;
    }
    const printHeader = `<tr>
      <th rowspan="2">Roll No.</th><th rowspan="2">Name</th>
      ${subjectNames.map((subjectName) => `<th colspan="3">${escapeHtml(subjectName)}</th>`).join('')}
    </tr><tr>
      ${subjectNames.map(() => '<th>First Term</th><th>Second Term</th><th>Difference</th>').join('')}
    </tr>`;
    const printRows = buildDataRows()
      .map((line) => `<tr>${line.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`)
      .join('');

    printWindow.document.write(`<!doctype html><html><head><title>Comparison - ${escapeHtml(className)}</title>
      <style>
        @page { size: A3 landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11pt; }
        h1, h2, p { text-align: center; margin: 4px 0; }
        h1 { font-size: 22pt; } h2 { font-size: 15pt; margin: 14px 0 8px; }
        table { border-collapse: collapse; width: 100%; font-size: 10pt; }
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
        <h2>Comparison of ${escapeHtml(className)}${section ? ` - Section ${escapeHtml(section)}` : ''} (${escapeHtml(modeLabel)})</h2>
        <p>${escapeHtml(firstLabel)} &rarr; ${escapeHtml(secondLabel)}</p>
        <table><thead>${printHeader}</thead><tbody>${printRows}</tbody></table>
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
            <h1 className="text-2xl font-bold text-slate-900">Comparison Report</h1>
            <p className="mt-1 text-sm text-slate-500">Compare subject marks of two exam terms side by side and see the difference.</p>
          </div>

          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {notice && !error && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <label className="text-xs font-semibold text-slate-600">
                Class
                <select className={`${inputClass} mt-1.5`} value={className} onChange={(event) => {
                  setClassName(event.target.value);
                  setSection('');
                  setFirstExamId('');
                  setSecondExamId('');
                }} disabled={loadingOptions}>
                  <option value="">Select class</option>
                  {[...classes].sort((first, second) =>
                    (Number(first.order) || 0) - (Number(second.order) || 0)
                    || collator.compare(first.className || '', second.className || '')
                  ).map((item) => <option key={item._id} value={item.className}>{item.className}</option>)}
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
                Marks
                <select className={`${inputClass} mt-1.5`} value={mode} onChange={(event) => setMode(event.target.value)}>
                  {markModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                First term
                <select className={`${inputClass} mt-1.5`} value={firstExamId} onChange={(event) => setFirstExamId(event.target.value)} disabled={!className || loadingOptions}>
                  <option value="">Select exam</option>
                  {availableExams.map((exam) => <option key={exam._id} value={exam._id}>{exam.examName}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Second term
                <select className={`${inputClass} mt-1.5`} value={secondExamId} onChange={(event) => setSecondExamId(event.target.value)} disabled={!className || loadingOptions}>
                  <option value="">Select exam</option>
                  {availableExams.filter((exam) => exam._id !== firstExamId).map((exam) => <option key={exam._id} value={exam._id}>{exam.examName}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={includeUnpublished} onChange={(event) => setIncludeUnpublished(event.target.checked)} />
                Include unpublished marks
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                {bothExamsSelected
                  ? `${className}${section ? ` · Section ${section}` : ' · All sections'} · ${modeLabel} · ${firstLabel} → ${secondLabel}`
                  : 'Choose a class and two exams to view the comparison.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={downloadExcel} disabled={!hasRows || loadingMarks} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                  <FileSpreadsheet size={16} /> Download Excel
                </button>
                <button type="button" onClick={downloadCsv} disabled={!hasRows || loadingMarks} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Download size={16} /> Download CSV
                </button>
                <button type="button" onClick={printReport} disabled={!hasRows || loadingMarks} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Printer size={16} /> Print / Save as PDF
                </button>
              </div>
            </div>
          </section>

          {bothExamsSelected && unpublishedExams.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <p>
                Results of {unpublishedExams.map((exam) => exam.examName).join(' and ')} are not published yet. The marks shown are what has been entered so far.
              </p>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loadingMarks ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><RefreshCw size={18} className="animate-spin" /> Loading marks...</div>
            ) : !bothExamsSelected ? (
              <div className="py-16 text-center text-slate-500"><ArrowLeftRight size={38} className="mx-auto mb-3 text-slate-300" /><p>Select a class and two exams to generate the comparison.</p></div>
            ) : !hasRows ? (
              <div className="py-16 text-center text-slate-500">
                <ArrowLeftRight size={38} className="mx-auto mb-3 text-slate-300" />
                <p>No marks found for this class, section, and exam pair.</p>
                <p className="mt-3 text-xs text-slate-500">
                  {firstLabel}: <strong>{firstScoped.length}</strong> marksheet(s) · {secondLabel}: <strong>{secondScoped.length}</strong> marksheet(s)
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {includeUnpublished
                    ? 'No marks have been entered for this class and exam pair yet.'
                    : 'If marks have been entered but results are unpublished, enable "Include unpublished marks".'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-100 px-5 py-3 text-sm">
                  <span><strong>{rows.length}</strong> students</span>
                  <span className="text-slate-500">{subjectNames.length} subjects · {modeLabel}</span>
                  <span className="text-indigo-700">{firstLabel} → {secondLabel}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th rowSpan={2} className="border border-slate-200 px-3 py-2 text-sm font-bold">Roll No.</th>
                        <th rowSpan={2} className="border border-slate-200 px-3 py-2 text-left text-sm font-bold">Name</th>
                        {subjectNames.map((subjectName) => (
                          <th key={subjectName} colSpan={3} className="border border-slate-200 px-3 py-2 text-sm font-bold">{subjectName}</th>
                        ))}
                      </tr>
                      <tr>
                        {subjectNames.flatMap((subjectName) => [
                          <th key={`${subjectName}-first`} className="border border-slate-200 px-2 py-1.5 text-xs font-bold">First Term</th>,
                          <th key={`${subjectName}-second`} className="border border-slate-200 px-2 py-1.5 text-xs font-bold">Second Term</th>,
                          <th key={`${subjectName}-diff`} className="border border-slate-200 px-2 py-1.5 text-xs font-bold">Difference</th>,
                        ])}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.studentId} className={index % 2 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-100 px-3 py-2.5 text-center tabular-nums">{getRollNumber(row.second || row.first) || index + 1}</td>
                          <td className="border border-slate-100 px-3 py-2.5 font-medium">{row.student?.name || '-'}</td>
                          {subjectNames.flatMap((subjectName) => {
                            const { firstValue, secondValue, difference } = getRowValues(row, subjectName);
                            return [
                              <td key={`${subjectName}-first`} className="border border-slate-100 px-2 py-2.5 text-center tabular-nums">{formatMark(firstValue)}</td>,
                              <td key={`${subjectName}-second`} className="border border-slate-100 px-2 py-2.5 text-center tabular-nums">{formatMark(secondValue)}</td>,
                              <td key={`${subjectName}-diff`} className={`border border-slate-100 px-2 py-2.5 text-center font-semibold tabular-nums ${difference == null ? 'text-slate-400' : difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-red-700' : 'text-slate-500'}`}>{formatDifference(difference)}</td>,
                            ];
                          })}
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

export default ComparisonReport;
