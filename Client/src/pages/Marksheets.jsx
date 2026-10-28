import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { marksheetAPI, settingsAPI } from '../services/api';
import Layout from '../components/Layout';
import { Trash2, Printer, Eye, Search, FileText, X } from 'lucide-react';
import { formatDecimal } from '../utils/numberFormat';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${url}`;
};

const gradeColor = (grade) => {
  const map = {
    'A+': 'text-emerald-700 bg-emerald-100',
    A:    'text-green-700 bg-green-100',
    'B+': 'text-blue-700 bg-blue-100',
    B:    'text-indigo-700 bg-indigo-100',
    'C+': 'text-yellow-700 bg-yellow-100',
    C:    'text-yellow-600 bg-yellow-50',
    D:    'text-orange-700 bg-orange-100',
    F:    'text-red-700 bg-red-100',
  };
  return map[grade] || 'text-gray-700 bg-gray-100';
};

const GRADE_REMARKS = {
  'A+': 'OUTSTANDING', A: 'EXCELLENT', 'B+': 'VERY GOOD',
  B: 'GOOD', 'C+': 'SATISFACTORY', C: 'ACCEPTABLE',
  D: 'BASIC', F: 'FAILED', NG: 'NOT GRADED',
};

const DEFAULT_GRADING_TABLE = [
  { range: '90 TO 100',      grade: 'A+', desc: 'OUTSTANDING',  gpa: '4.0' },
  { range: '80 TO BELOW 90', grade: 'A',  desc: 'EXCELLENT',    gpa: '3.6' },
  { range: '70 TO BELOW 80', grade: 'B+', desc: 'VERY GOOD',    gpa: '3.2' },
  { range: '60 TO BELOW 70', grade: 'B',  desc: 'GOOD',         gpa: '2.8' },
  { range: '50 TO BELOW 60', grade: 'C+', desc: 'SATISFACTORY', gpa: '2.4' },
  { range: '40 TO BELOW 50', grade: 'C',  desc: 'ACCEPTABLE',   gpa: '2.0' },
  { range: '35 TO BELOW 40', grade: 'D',  desc: 'BASIC',        gpa: '1.6' },
  { range: '0 TO BELOW 35',  grade: 'NG', desc: 'NOT GRADED',   gpa: ''    },
];

const classNameSort = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// "Class 10" already says "class", so the redundant word is dropped: "GRADE 10".
// Whole word only — "Nursery" and "KG" are left untouched.
const getGradeLabel = (className) => {
  if (!className) return '';
  const stripped = String(className).replace(/\bclass(?![a-z])/gi, '').replace(/\s+/g, ' ').trim();
  return `GRADE ${stripped || className}`;
};

const buildGradingRows = (settings) => {
  if (!settings?.gradingSystem?.length) return DEFAULT_GRADING_TABLE;
  const sorted = [...settings.gradingSystem].sort((a, b) => b.minPercentage - a.minPercentage);
  return sorted.map((row, i) => ({
    range: i === 0
      ? `${row.minPercentage} TO 100`
      : `${row.minPercentage} TO BELOW ${sorted[i - 1].minPercentage}`,
    grade: row.grade,
    desc:  GRADE_REMARKS[row.grade] || '',
    gpa:   row.gpa != null ? String(row.gpa) : '',
  }));
};

// Pull subject config from the exam's classExamConfigs
const getExamSubject = (marksheet, subjectName) =>
  marksheet.exam?.classExamConfigs
    ?.find((c) => c.className === marksheet.student?.className)
    ?.subjects?.find((s) => s.subjectName === subjectName)
  || marksheet.exam?.classExamConfigs
    ?.flatMap((c) => c.subjects || [])
    ?.find((s) => s.subjectName === subjectName);

// Build subject rows for the official grade sheet
const buildSubjectRows = (marksheet) =>
  (marksheet.marks || []).map((m, i) => {
    const config     = getExamSubject(marksheet, m.subject);
    const hasPrac    = Boolean(m.hasPractical || config?.hasPractical);
    const thFull     = hasPrac ? (m.theoryFullMarks || config?.theoryFullMarks || 0) : m.fullMarks;
    const inFull     = hasPrac ? (m.practicalFullMarks || config?.practicalFullMarks || 0) : 0;
    const thPct      = thFull  ? (m.theory   / thFull) * 100 : 0;
    const inPct      = inFull  ? (m.practical / inFull) * 100 : 0;
    const thGP       = thFull  ? Number(getGradePointLocal(thPct).toFixed(2)) : null;
    const inGP       = inFull  ? Number(getGradePointLocal(inPct).toFixed(2)) : null;
    const thGrade    = thFull  ? getGradeLocal(thPct) : null;
    const inGrade    = inFull  ? getGradeLocal(inPct) : null;
    const creditHour = Number(m.creditHour || config?.creditHour || 0) || null;

    return {
      sn:         i + 1,
      name:       m.subject,
      thCH:       creditHour,
      thGP:       hasPrac ? thGP : (m.gradePoint ?? thGP),
      thGrade:    hasPrac ? thGrade : (m.grade || thGrade),
      inCH:       hasPrac ? creditHour : null,
      inGP:       hasPrac ? inGP : null,
      inGrade:    hasPrac ? inGrade : null,
      finalGrade: m.grade || '—',
      remarks:    GRADE_REMARKS[m.grade] || '—',
    };
  });

// Local grade helpers (mirrors server calculateGPA — no import needed client-side)
const getGradePointLocal = (pct = 0) => {
  const v = Number(pct || 0);
  if (v >= 90) return 4.0; if (v >= 80) return 3.6; if (v >= 70) return 3.2;
  if (v >= 60) return 2.8; if (v >= 50) return 2.4; if (v >= 40) return 2.0;
  return 0.0;
};
const getGradeLocal = (pct = 0) => {
  const v = Number(pct || 0);
  if (v >= 90) return 'A+'; if (v >= 80) return 'A';  if (v >= 70) return 'B+';
  if (v >= 60) return 'B';  if (v >= 50) return 'C+'; if (v >= 40) return 'C';
  if (v >= 35) return 'D';  return 'NG';
};

// ─── Official Grade Sheet HTML (for print window) ─────────────────────────────
const buildGradeSheetHTML = (marksheet, settings) => {
  const s        = settings || {};
  const student  = marksheet.student || {};
  const exam     = marksheet.exam    || {};
  const logoUrl  = getImageUrl(s.logoUrl);
  const sigUrl   = getImageUrl(s.headTeacherSignatureUrl);
  const addr     = [s.municipality, s.district, s.province].filter(Boolean).join(', ');
  const rows     = buildSubjectRows(marksheet);
  const gradRows = buildGradingRows(settings);
  const waterTxt = s.schoolName || 'School';

  const thS = `border:1px solid #555;padding:5px 6px;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.04em;`;
  const tdS = `border:1px solid #777;padding:4px 6px;font-size:11px;vertical-align:middle;`;

  const subjectRowsHTML = rows.map((r) => `
    <tr>
      <td style="${tdS}text-align:left;font-weight:600;color:#111">
        ${r.name}
      </td>
      <td style="${tdS}text-align:center">${r.thCH ?? '—'}</td>
      <td style="${tdS}text-align:center">
        ${r.thGP != null ? r.thGP : '—'}${r.thGrade ? ' / ' + r.thGrade : ''}
      </td>
      <td style="${tdS}text-align:center">${r.inCH ?? '—'}</td>
      <td style="${tdS}text-align:center">
        ${r.inGP != null ? r.inGP : '—'}${r.inGrade ? ' / ' + r.inGrade : ''}
      </td>
      <td style="${tdS}text-align:center;font-weight:700;font-size:12px;color:#1e3a5f">
        ${r.finalGrade}
      </td>
      <td style="${tdS}text-align:left;font-weight:600;color:#065f46">
        ${r.remarks}
      </td>
    </tr>`).join('');

  const legendRowsHTML = gradRows.map((r, i) => `
    <tr style="background:${i % 2 === 1 ? '#fafafa' : '#fff'}">
      <td style="${tdS}text-align:center">${i + 1}</td>
      <td style="${tdS}text-align:left">${r.range}</td>
      <td style="${tdS}text-align:center;font-weight:700">${r.grade}</td>
      <td style="${tdS}text-align:left">${r.desc}</td>
      <td style="${tdS}text-align:center">${r.gpa}</td>
    </tr>`).join('');

  // Build watermark rows
  const wmRows = Array.from({ length: 48 }).map(() =>
    `<div class="watermark-row"><span>${waterTxt}</span><span>${waterTxt}</span><span>${waterTxt}</span><span>${waterTxt}</span></div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Grade Sheet — ${student.name || 'Student'}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#d1d5db;color:#111;font-size:12px}
    .page{width:210mm;min-height:297mm;margin:8mm auto;background:#fff}
    .inner{position:relative;margin:8mm;padding:10mm 12mm;border:2.5px solid #1e293b;min-height:270mm;overflow:hidden}
    .watermark{position:absolute;inset:8px;z-index:0;overflow:hidden;opacity:.18;pointer-events:none;user-select:none;color:#1e293b;display:grid;grid-template-rows:repeat(48,minmax(0,1fr));align-items:center}
    .watermark-row{display:flex;align-items:center;justify-content:space-evenly;gap:3px;padding:0 3px;white-space:nowrap;line-height:1}
    .watermark-row span{font-size:7px;padding:0;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
    .content{position:relative;z-index:1}
    table{border-collapse:collapse;width:100%}
    @page{size:A4 portrait;margin:0}
    @media print{
      html,body{background:#fff!important}
      .no-print{display:none!important}
      .page{width:100%;margin:0}
      .inner{margin:6mm;padding:9mm 11mm;min-height:calc(297mm - 24mm)}
    }
  </style>
</head>
<body>

<div class="no-print" style="text-align:center;padding:12px;background:#f3f4f6;border-bottom:1px solid #ddd;position:sticky;top:0;z-index:100">
  <button onclick="window.print()"
          style="background:#4f46e5;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-right:8px">
    🖨 Print / Save as PDF
  </button>
  <button onclick="window.close()"
          style="background:#fff;color:#374151;border:1px solid #d1d5db;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer">
    Close
  </button>
</div>

<div class="page">
<div class="inner">

  <!-- Watermark -->
  <div class="watermark">${wmRows}</div>

  <!-- Content -->
  <div class="content">

    <!-- School Header -->
    <div style="width:100%;display:grid;grid-template-columns:72px minmax(0,1fr) 72px;align-items:center;margin-bottom:6px;text-align:center">
      ${logoUrl ? `<img src="${logoUrl}" style="height:72px;width:72px;object-fit:contain" alt="Logo">` : '<div></div>'}
      <div style="text-align:center">
        <div style="font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#b91c1c;line-height:1.2">
          ${s.schoolName || 'School Name'}
        </div>
        ${addr ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#b91c1c;margin-top:2px">${addr}</div>` : ''}
        ${s.address ? `<div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#b91c1c">${s.address}</div>` : ''}
        ${student.className ? `<div style="font-size:12px;font-weight:900;text-transform:uppercase;color:#b91c1c;margin-top:2px">${getGradeLabel(student.className)}</div>` : ''}
      </div>
      <div></div>
    </div>

    <!-- Title -->
    <div style="width:100%;display:flex;justify-content:center;text-align:center;margin:6px 0">
      <span style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:3px;text-align:center;
                   border-top:2px solid #111;border-bottom:2px solid #111;padding:4px 36px;display:inline-block">
        GRADE SHEET
      </span>
    </div>

    <!-- Student Info -->
    <table style="font-size:11px;margin-bottom:10px">
      <tr>
        <td style="font-weight:700;text-transform:uppercase;padding-right:4px;white-space:nowrap">THE GRADE(S) SECURED BY</td>
        <td style="font-weight:700;border-bottom:1px dotted #555;padding:2px 4px;min-width:180px">
          ${(student.name || '').toUpperCase()}${student.symbolNo ? ' (' + student.symbolNo + ')' : ''}
        </td>
        <td style="font-weight:700;text-transform:uppercase;padding:0 8px;white-space:nowrap">SYMBOL NO</td>
        <td style="border-bottom:1px dotted #555;padding:2px 4px;min-width:100px">${student.symbolNo || ''}</td>
      </tr>
      <tr>
        <td style="font-weight:700;text-transform:uppercase;padding-right:4px;white-space:nowrap">DATE OF BIRTH</td>
        <td style="font-weight:700;border-bottom:1px dotted #555;padding:2px 4px">
          ${[student.dobBs && student.dobBs + ' (B.S.)', student.dob && new Date(student.dob).toLocaleDateString('en-US') + ' (A.D)'].filter(Boolean).join('  ') || '—'}
        </td>
        <td style="font-weight:700;text-transform:uppercase;padding:0 8px;white-space:nowrap">ROLL NO</td>
        <td style="font-weight:700;border-bottom:1px dotted #555;padding:2px 4px">${student.rollNo || '—'}</td>
      </tr>
      <tr>
        <td style="font-weight:700;text-transform:uppercase;padding-right:4px">OF</td>
        <td style="font-weight:700;border-bottom:1px dotted #555;padding:2px 4px">
          ${[s.schoolName, s.municipality].filter(Boolean).join(', ')}
        </td>
        <td style="font-weight:700;text-transform:uppercase;padding:0 8px;white-space:nowrap">IEMIS CODE</td>
        <td style="font-weight:700;border-bottom:1px dotted #555;padding:2px 4px">${s.schoolCode || '—'}</td>
      </tr>
      <tr>
        <td colspan="4" style="font-weight:700;text-transform:uppercase;border-bottom:1px dotted #555;padding:3px 0">
          IN THE EXAMINATION CONDUCTED IN &nbsp;
          <strong>${exam.academicYear || marksheet.academicYear || '—'}</strong>
          &nbsp; ARE GIVEN BELOW.
        </td>
      </tr>
    </table>

    <!-- Subject Table -->
    <table style="border:1px solid #555;margin-bottom:4px">
      <thead>
        <tr style="background:#f3f4f6">
          <th rowspan="2" style="${thS}text-align:left;width:30%">SUBJECTS</th>
          <th colspan="2" style="${thS}text-align:center;width:14%">THEORY (TH)</th>
          <th colspan="2" style="${thS}text-align:center;width:14%">INTERNAL (IN)</th>
          <th rowspan="2" style="${thS}text-align:center;width:9%">FINAL<br>GRADE</th>
          <th rowspan="2" style="${thS}text-align:center;width:13%">REMARKS</th>
        </tr>
        <tr style="background:#f3f4f6">
          <th style="${thS}text-align:center;width:7%">CH</th>
          <th style="${thS}text-align:center;width:7%">GP / GR</th>
          <th style="${thS}text-align:center;width:7%">CH</th>
          <th style="${thS}text-align:center;width:7%">GP / GR</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRowsHTML}
        <tr style="background:#f3f4f6;border-top:2px solid #555">
          <td colspan="4" style="${tdS}text-align:right;font-weight:700;font-size:11px">
            TOTAL CREDIT HOURS: ${marksheet.totalCreditHour || '—'} &nbsp;&nbsp;&nbsp;
            GRADE POINT AVERAGE = ${formatDecimal(marksheet.gpa, '—')}
          </td>
          <td style="${tdS}text-align:center;font-weight:800;font-size:13px">${marksheet.grade || '—'}</td>
          <td colspan="2" style="${tdS}text-align:center;font-weight:700;color:${marksheet.result === 'Pass' ? '#065f46' : '#dc2626'}">
            ${marksheet.result === 'Pass' ? 'PASS' : 'FAIL'}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Footnotes -->
    <div style="font-size:9px;color:#555;margin-bottom:10px;line-height:1.7">
      <div>1. ONE CREDIT HOUR EQUALS <strong>32 HOURS</strong></div>
      <div>2. TH: THEORY(FINAL/EXTERNAL) &nbsp;&nbsp;&nbsp; IN: INTERNAL</div>
    </div>

    <!-- Grade Legend -->
    <table style="border:1px solid #555;margin-bottom:0">
      <thead>
        <tr style="background:#f3f4f6">
          <th colspan="5" style="${thS}text-align:center;font-size:11px;letter-spacing:3px;padding:5px">
            DETAILS OF GRADE SHEET
          </th>
        </tr>
        <tr style="background:#f3f4f6">
          <th style="${thS}text-align:center;width:6%">S.N.</th>
          <th style="${thS}text-align:left;width:28%">ACHIEVEMENT IN PERCENT</th>
          <th style="${thS}text-align:center;width:12%">GRADE</th>
          <th style="${thS}text-align:left;width:38%">DESCRIPTION</th>
          <th style="${thS}text-align:center;width:16%">GRADE POINT</th>
        </tr>
      </thead>
      <tbody>${legendRowsHTML}</tbody>
    </table>

    <div style="height:30px"></div>

    <!-- Signatures -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:65px">
      <div style="text-align:center;min-width:160px">
        <div style="border-top:1px dashed #555;padding-top:4px;font-size:11px;font-weight:600;
                    text-transform:uppercase;letter-spacing:1px">
          Class Teacher
        </div>
      </div>
      <div style="text-align:center;min-width:160px">
        ${sigUrl ? `<img src="${sigUrl}" style="height:44px;object-fit:contain;display:block;margin:0 auto 4px" alt="Signature">` : ''}
        <div style="border-top:1px dashed #555;padding-top:4px;font-size:11px;font-weight:600;
                    text-transform:uppercase;letter-spacing:1px">
          ${s.headTeacherName || s.principalName || 'Head Teacher'}
        </div>
      </div>
    </div>

  </div><!-- /content -->
</div><!-- /inner -->
</div><!-- /page -->

<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); }</script>
</body>
</html>`;
};

const buildBatchPrintDocument = (pageMarkup, styles) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Marksheets</title>
  <style>
    ${styles}
    @media print {
      @page { size: A4 portrait; margin: 0; }
      html, body { margin: 0 !important; background: #fff !important; }
      .batch-print-page {
        height: 297mm;
        overflow: hidden;
        break-after: auto;
        page-break-after: auto;
      }
      .batch-print-page + .batch-print-page {
        break-before: page;
        page-break-before: always;
      }
      .batch-print-page .page {
        width: 210mm;
        height: 297mm;
        min-height: 0;
        margin: 0 auto;
        overflow: hidden;
      }
    }
  </style>
</head>
<body>
  <main id="batch-print-container">${pageMarkup.join('')}</main>
</body>
</html>`;

const getBatchPrintParts = (marksheet, settings) => {
  const html = buildGradeSheetHTML(marksheet, settings);
  const styles = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
  const page = html.match(/<div class="page">[\s\S]*?<\/div><!-- \/page -->/i)?.[0];
  if (!styles || !page) {
    throw new Error('Failed to build a marksheet print page');
  }
  return {
    styles,
    page: `<div class="batch-print-page">${page}</div>`,
  };
};

// ─── React Grade Sheet Preview (modal) ────────────────────────────────────────
const GradeSheetPreview = ({ marksheet, settings }) => {
  if (!marksheet) return null;
  const s        = settings || {};
  const student  = marksheet.student || {};
  const exam     = marksheet.exam    || {};
  const rows     = buildSubjectRows(marksheet);
  const gradRows = buildGradingRows(settings);
  const addr     = [s.municipality, s.district, s.province].filter(Boolean).join(', ');
  const waterTxt = s.schoolName || 'School';

  return (
    <div className="marksheet-print-document relative bg-white overflow-hidden" style={{ fontFamily: "'Segoe UI', Arial, sans-serif",
         border: '2.5px solid #1e293b', margin: '12px', borderRadius: 2 }}>

      {/* Watermark */}
      <div aria-hidden="true" className="pointer-events-none absolute z-0 overflow-hidden select-none"
           style={{ inset: 8, opacity: 0.18, color: '#1e293b', display: 'grid', gridTemplateRows: 'repeat(48, minmax(0, 1fr))', alignItems: 'center' }}>
        {Array.from({ length: 48 }).map((_, r) => (
          <div key={r} className="flex items-center justify-evenly whitespace-nowrap leading-none" style={{ gap: 3, padding: '0 3px' }}>
            {[0, 1, 2, 3].map((c) => (
              <span key={c} className="font-bold uppercase"
                    style={{ fontSize: 7, letterSpacing: '0.5px', padding: 0, display: 'inline-block' }}>
                {waterTxt}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 px-7 py-6">

        {/* Header */}
        <div className="grid w-full items-center mb-2 text-center"
             style={{ gridTemplateColumns: '64px minmax(0, 1fr) 64px' }}>
          {s.logoUrl && (
            <img src={getImageUrl(s.logoUrl)} alt="Logo"
                 className="h-16 w-16 object-contain" />
          )}
          {!s.logoUrl && (
            <div />
          )}
          <div className="text-center">
            <div className="font-black uppercase tracking-wide text-red-700 leading-tight"
                 style={{ fontSize: 18 }}>
              {s.schoolName || 'School Name'}
            </div>
            {addr && <div className="font-bold uppercase text-red-700" style={{ fontSize: 11 }}>{addr}</div>}
            {s.address && <div className="font-semibold uppercase text-red-700" style={{ fontSize: 10 }}>{s.address}</div>}
            {student.className && (
              <div className="font-black uppercase text-red-700" style={{ fontSize: 11 }}>
                {getGradeLabel(student.className)}
              </div>
            )}
          </div>
          <div />
        </div>

        {/* Title */}
        <div className="flex w-full justify-center text-center my-2" style={{ width: '100%', textAlign: 'center' }}>
          <span className="font-black uppercase text-gray-900"
                style={{ fontSize: 14, letterSpacing: 3,
                         borderTop: '2px solid #111', borderBottom: '2px solid #111',
                         padding: '3px 32px', display: 'inline-block', textAlign: 'center' }}>
            GRADE SHEET
          </span>
        </div>

        {/* Student info */}
        <table className="w-full mb-3" style={{ fontSize: 11, borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td className="font-bold uppercase whitespace-nowrap pr-1 py-0.5">THE GRADE(S) SECURED BY</td>
              <td className="font-bold py-0.5 px-1" style={{ borderBottom: '1px dotted #666', minWidth: 160 }}>
                {student.name?.toUpperCase()}{student.symbolNo ? ` (${student.symbolNo})` : ''}
              </td>
              <td className="font-bold uppercase px-2 py-0.5 whitespace-nowrap">SYMBOL NO</td>
              <td className="py-0.5 px-1" style={{ borderBottom: '1px dotted #666', minWidth: 80 }}>
                {student.symbolNo || ''}
              </td>
            </tr>
            <tr>
              <td className="font-bold uppercase whitespace-nowrap pr-1 py-0.5">DATE OF BIRTH</td>
              <td className="font-bold py-0.5 px-1" style={{ borderBottom: '1px dotted #666' }}>
                {[student.dobBs && `${student.dobBs} (B.S.)`, student.dob && `${new Date(student.dob).toLocaleDateString('en-US')} (A.D)`].filter(Boolean).join('  ') || '—'}
              </td>
              <td className="font-bold uppercase px-2 py-0.5 whitespace-nowrap">ROLL NO</td>
              <td className="font-bold py-0.5 px-1" style={{ borderBottom: '1px dotted #666' }}>
                {student.rollNo || '—'}
              </td>
            </tr>
            <tr>
              <td className="font-bold uppercase pr-1 py-0.5">OF</td>
              <td className="font-bold py-0.5 px-1" style={{ borderBottom: '1px dotted #666' }}>
                {[s.schoolName, s.municipality].filter(Boolean).join(', ')}
              </td>
              <td className="font-bold uppercase px-2 py-0.5 whitespace-nowrap">IEMIS CODE</td>
              <td className="font-bold py-0.5 px-1" style={{ borderBottom: '1px dotted #666' }}>
                {s.schoolCode || '—'}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="font-bold uppercase py-1"
                  style={{ borderBottom: '1px dotted #666', fontSize: 11 }}>
                IN THE EXAMINATION CONDUCTED IN &nbsp;
                <strong>{exam.academicYear || marksheet.academicYear || '—'}</strong>
                &nbsp; ARE GIVEN BELOW.
              </td>
            </tr>
          </tbody>
        </table>

        {/* Subject Table */}
        <table className="w-full mb-1" style={{ fontSize: 11, borderCollapse: 'collapse', border: '1px solid #555' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th rowSpan={2} style={pthS('left', '30%')}>SUBJECTS</th>
              <th colSpan={2} style={pthS('center', '14%')}>THEORY (TH)</th>
              <th colSpan={2} style={pthS('center', '14%')}>INTERNAL (IN)</th>
              <th rowSpan={2} style={pthS('center', '9%')}>FINAL<br />GRADE</th>
              <th rowSpan={2} style={pthS('center', '13%')}>REMARKS</th>
            </tr>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={pthS('center', '7%')}>CH</th>
              <th style={pthS('center', '7%')}>GP / GR</th>
              <th style={pthS('center', '7%')}>CH</th>
              <th style={pthS('center', '7%')}>GP / GR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                <td style={ptdS('left')}>
                  <span style={{ fontWeight: 600, color: '#111' }}>{r.name}</span>
                </td>
                <td style={ptdS('center')}>{r.thCH ?? '—'}</td>
                <td style={ptdS('center')}>
                  {r.thGP != null ? r.thGP : '—'}{r.thGrade ? ` / ${r.thGrade}` : ''}
                </td>
                <td style={ptdS('center')}>{r.inCH ?? '—'}</td>
                <td style={ptdS('center')}>
                  {r.inGP != null ? r.inGP : '—'}{r.inGrade ? ` / ${r.inGrade}` : ''}
                </td>
                <td style={{ ...ptdS('center'), fontWeight: 700, fontSize: 12,
                             color: '#1e3a5f' }}>
                  {r.finalGrade}
                </td>
                <td style={{ ...ptdS('left'), fontWeight: 600,
                             color: '#065f46' }}>
                  {r.remarks}
                </td>
              </tr>
            ))}
            <tr style={{ background: '#f3f4f6', borderTop: '2px solid #555' }}>
              <td colSpan={4} style={{ ...ptdS('right'), fontWeight: 700, fontSize: 11 }}>
                TOTAL CREDIT HOURS: {marksheet.totalCreditHour || '—'}&nbsp;&nbsp;&nbsp;
                GRADE POINT AVERAGE = {formatDecimal(marksheet.gpa, '—')}
              </td>
              <td style={{ ...ptdS('center'), fontWeight: 800, fontSize: 13 }}>
                {marksheet.grade || '—'}
              </td>
              <td colSpan={2} style={{ ...ptdS('center'), fontWeight: 700,
                                      color: marksheet.result === 'Pass' ? '#065f46' : '#dc2626' }}>
                {marksheet.result === 'Pass' ? 'PASS' : 'FAIL'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footnotes */}
        <div style={{ fontSize: 9, color: '#555', marginBottom: 10, lineHeight: 1.7 }}>
          <div>1. ONE CREDIT HOUR EQUALS <strong>32 HOURS</strong></div>
          <div>2. TH: THEORY(FINAL/EXTERNAL) &nbsp;&nbsp;&nbsp; IN: INTERNAL</div>
        </div>

        {/* Grade Legend */}
        <table className="w-full" style={{ fontSize: 10, borderCollapse: 'collapse', border: '1px solid #555' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th colSpan={5} style={{ ...pthS('center'), fontSize: 11, letterSpacing: 3, padding: '4px 6px',
                                       border: '1px solid #555' }}>
                DETAILS OF GRADE SHEET
              </th>
            </tr>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={pthS('center', '6%')}>S.N.</th>
              <th style={pthS('left', '28%')}>ACHIEVEMENT IN PERCENT</th>
              <th style={pthS('center', '12%')}>GRADE</th>
              <th style={pthS('left', '38%')}>DESCRIPTION</th>
              <th style={pthS('center', '16%')}>GRADE POINT</th>
            </tr>
          </thead>
          <tbody>
            {gradRows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                <td style={ptdS('center')}>{i + 1}</td>
                <td style={ptdS('left')}>{r.range}</td>
                <td style={{ ...ptdS('center'), fontWeight: 700 }}>{r.grade}</td>
                <td style={ptdS('left')}>{r.desc}</td>
                <td style={ptdS('center')}>{r.gpa}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 65 }}>
          <div style={{ textAlign: 'center', minWidth: 140 }}>
            <div style={{ borderTop: '1px dashed #555', paddingTop: 4, fontSize: 11,
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Class Teacher
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: 140 }}>
            {s.headTeacherSignatureUrl && (
              <img src={getImageUrl(s.headTeacherSignatureUrl)} alt="Signature"
                   style={{ height: 44, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
            )}
            <div style={{ borderTop: '1px dashed #555', paddingTop: 4, fontSize: 11,
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {s.headTeacherName || s.principalName || 'Head Teacher'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Inline style helpers for preview table
const pthS = (align = 'center', width) => ({
  border: '1px solid #555', padding: '5px 6px', fontWeight: 700,
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em',
  textAlign: align, ...(width ? { width } : {}),
});
const ptdS = (align = 'center', color) => ({
  border: '1px solid #777', padding: '4px 6px', fontSize: 11,
  verticalAlign: 'middle', textAlign: align, ...(color ? { color } : {}),
});

// ─── Main Marksheets Page ─────────────────────────────────────────────────────
const Marksheets = () => {
  const [marksheets,         setMarksheets]         = useState([]);
  const [filteredMarksheets, setFilteredMarksheets] = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState('');
  const [searchTerm,         setSearchTerm]         = useState('');
  const [filterClass,        setFilterClass]        = useState('');
  const [filterSection,      setFilterSection]      = useState('');
  const [filterExam,         setFilterExam]         = useState('');
  const [minGPA,             setMinGPA]             = useState('');
  const [maxGPA,             setMaxGPA]             = useState('');
  const [deleteConfirm,      setDeleteConfirm]      = useState(null);
  const [selectedMarksheet,  setSelectedMarksheet]  = useState(null);
  const [settings,           setSettings]           = useState(null);
  const [printPending,       setPrintPending]       = useState(false);
  const [batchPrintLoading,  setBatchPrintLoading]  = useState(false);

  useEffect(() => { fetchMarksheets(); }, []);
  useEffect(() => {
    settingsAPI.get().then((r) => setSettings(r.data.settings)).catch(() => {});
  }, []);
  useEffect(() => { applyFilters(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marksheets, searchTerm, filterClass, filterSection, filterExam, minGPA, maxGPA]);

  useEffect(() => {
    if (!printPending || !selectedMarksheet) return;
    setPrintPending(false);
    window.print();
  }, [printPending, selectedMarksheet]);

  const fetchMarksheets = async () => {
    try {
      setLoading(true);
      const res = await marksheetAPI.getAll();
      setMarksheets(res.data.marksheets || []);
    } catch {
      setError('Failed to fetch marksheets');
    } finally {
      setLoading(false);
    }
  };

  // Derived filter options
  const classOptions   = [...new Set(marksheets.map((m) => m.student?.className).filter(Boolean))]
    .sort(classNameSort.compare);
  const sectionOptions = [...new Set(
    marksheets
      .filter((m) => !filterClass || m.student?.className === filterClass)
      .map((m) => m.student?.section).filter(Boolean)
  )].sort();
  const examOptions = [...new Map(
    marksheets
      .map((m) => ({ id: m.exam?._id, name: m.exam?.examName }))
      .filter((e) => e.id && e.name)
      .map((e) => [e.id, e])
  ).values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const applyFilters = () => {
    let filtered = marksheets;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((m) =>
        m.student?.name?.toLowerCase().includes(q) ||
        String(m.student?.rollNo || '').includes(q) ||
        m.exam?.examName?.toLowerCase().includes(q)
      );
    }
    if (filterClass)   filtered = filtered.filter((m) => m.student?.className === filterClass);
    if (filterSection) filtered = filtered.filter((m) => m.student?.section    === filterSection);
    if (filterExam)    filtered = filtered.filter((m) => String(m.exam?._id)   === String(filterExam));
    const min = parseFloat(minGPA), max = parseFloat(maxGPA);
    if (!Number.isNaN(min)) filtered = filtered.filter((m) => Number(m.gpa || 0) >= min);
    if (!Number.isNaN(max)) filtered = filtered.filter((m) => Number(m.gpa || 0) <= max);
    setFilteredMarksheets(filtered);
  };

  const handleDelete = async (id) => {
    try {
      await marksheetAPI.delete(id);
      setMarksheets((prev) => prev.filter((m) => m._id !== id));
      setDeleteConfirm(null);
      if (selectedMarksheet?._id === id) setSelectedMarksheet(null);
    } catch {
      setError('Failed to delete marksheet');
    }
  };

  const handlePrint = (marksheet) => {
    setSelectedMarksheet(marksheet);
    setPrintPending(true);
  };

  const handlePrintAll = async () => {
    if (filteredMarksheets.length === 0 || batchPrintLoading) return;

    let iframe;
    let cleanupTimer;
    const cleanupIframe = () => {
      window.clearTimeout(cleanupTimer);
      iframe?.remove();
      iframe = null;
    };

    setBatchPrintLoading(true);
    try {
      const pages = [];
      let printStyles = '';
      const chunkSize = 5;

      for (let start = 0; start < filteredMarksheets.length; start += chunkSize) {
        const chunk = filteredMarksheets.slice(start, start + chunkSize);
        chunk.forEach((marksheet) => {
          const parts = getBatchPrintParts(marksheet, settings);
          if (!printStyles) printStyles = parts.styles;
          pages.push(parts.page);
        });
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      iframe = document.createElement('iframe');
      iframe.title = 'Marksheets print preview';
      iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;';
      iframe.srcdoc = buildBatchPrintDocument(pages, printStyles);

      await new Promise((resolve, reject) => {
        const loadTimeout = window.setTimeout(() => reject(new Error('Print document load timed out')), 15000);
        iframe.addEventListener('load', () => {
          window.clearTimeout(loadTimeout);
          iframe?.contentWindow?.addEventListener('afterprint', cleanupIframe, { once: true });
          resolve();
        }, { once: true });
        iframe.addEventListener('error', () => {
          window.clearTimeout(loadTimeout);
          reject(new Error('Print document failed to load'));
        }, { once: true });
        document.body.appendChild(iframe);
      });

      const frameWindow = iframe.contentWindow;
      if (!frameWindow) throw new Error('Print window is unavailable');

      const images = Array.from(iframe.contentDocument?.images || []);
      if (images.some((image) => !image.complete)) {
        await Promise.race([
          Promise.all(images.map((image) => image.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            }))),
          new Promise((resolve) => window.setTimeout(resolve, 5000)),
        ]);
      }

      setBatchPrintLoading(false);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      frameWindow.focus();
      cleanupTimer = window.setTimeout(cleanupIframe, 300000);
      frameWindow.print();
    } catch (err) {
      console.error('Batch print failed:', err);
      setError('Failed to prepare marksheets for printing');
      cleanupIframe();
    } finally {
      setBatchPrintLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marksheets</h1>
            <p className="text-sm text-gray-400 mt-0.5">{marksheets.length} marksheets</p>
          </div>
          <button
            type="button"
            onClick={handlePrintAll}
            disabled={loading || batchPrintLoading || filteredMarksheets.length === 0}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {batchPrintLoading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              : <Printer size={16} />}
            {batchPrintLoading ? 'Preparing…' : `Print All${filteredMarksheets.length > 0 ? ` (${filteredMarksheets.length})` : ''}`}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student, roll, exam…"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
            <select value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition">
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)}
              disabled={!filterClass}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition disabled:opacity-50">
              <option value="">All Sections</option>
              {sectionOptions.map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
            <select value={filterExam} onChange={(e) => setFilterExam(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition">
              <option value="">All Exams</option>
              {examOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" value={minGPA} onChange={(e) => setMinGPA(e.target.value)}
                placeholder="Min GPA"
                className="w-1/2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              <input type="number" value={maxGPA} onChange={(e) => setMaxGPA(e.target.value)}
                placeholder="Max GPA"
                className="w-1/2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredMarksheets.length === 0 ? (
              <div className="py-16 text-center">
                <FileText size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No marksheets found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Student', 'Class', 'Exam', 'Total Marks', '%', 'GPA', 'Grade', 'Result', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMarksheets.map((ms) => (
                      <tr key={ms._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                              {ms.student?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800">{ms.student?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{ms.student?.className}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">{ms.exam?.examName}</td>
                        <td className="px-4 py-3 text-gray-700 font-medium tabular-nums">{ms.totalMarks}/{ms.totalFullMarks}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 tabular-nums">{formatDecimal(ms.percentage, 'N/A')}%</td>
                        <td className="px-4 py-3 font-bold text-indigo-700 tabular-nums">{formatDecimal(ms.gpa, 'N/A')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${gradeColor(ms.grade)}`}>{ms.grade}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ms.result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {ms.result}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelectedMarksheet(ms)}
                                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition" title="View Grade Sheet">
                              <Eye size={15} />
                            </button>
                            <button onClick={() => handlePrint(ms)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Print Grade Sheet">
                              <Printer size={15} />
                            </button>
                            <button onClick={() => setDeleteConfirm(ms._id)}
                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Marksheet?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grade Sheet Preview Modal ──────────────────────────────────────── */}
      {selectedMarksheet && (
        createPortal(
        <>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              body { margin: 0 !important; background: #fff !important; }
              #root { display: none !important; }
              .marksheet-print-overlay {
                position: static !important;
                display: block !important;
                overflow: visible !important;
                padding: 0 !important;
                background: #fff !important;
              }
              .marksheet-print-modal {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                overflow: visible !important;
                box-shadow: none !important;
              }
              .marksheet-print-scroll {
                max-height: none !important;
                overflow: visible !important;
              }
              .marksheet-print-toolbar { display: none !important; }
              .marksheet-print-document {
                position: relative !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                border-radius: 0 !important;
                break-after: auto !important;
                page-break-after: auto !important;
              }
            }
          `}</style>
          <div className="marksheet-print-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="marksheet-print-modal bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-4">

            {/* Modal toolbar */}
            <div className="marksheet-print-toolbar flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50 rounded-t-2xl sticky top-0 z-10">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{selectedMarksheet.student?.name}</p>
                <p className="text-xs text-gray-400 truncate">{selectedMarksheet.exam?.examName}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handlePrint(selectedMarksheet)}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  <Printer size={15} /> Print / PDF
                </button>
                <button onClick={() => setSelectedMarksheet(null)}
                        className="p-2 hover:bg-gray-200 rounded-xl transition">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Grade Sheet preview — A4-like white doc */}
            <div className="marksheet-print-scroll overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px)' }}>
              <GradeSheetPreview marksheet={selectedMarksheet} settings={settings} />
            </div>

          </div>
          </div>
        </>,
        document.body
        )
      )}

    </Layout>
  );
};

export default Marksheets;
