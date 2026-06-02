// Enhanced PDF Export Utility for Student Evaluation Dashboard

export const generateEvaluationPDF = (dashboard, selectedStudent, selectedExams, mode) => {
  if (!dashboard || !selectedStudent) {
    console.error('Missing required data for PDF generation');
    return;
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Student Evaluation Report - ${selectedStudent.name}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          color: #4f46e5;
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .header p {
          color: #666;
          font-size: 14px;
        }
        
        .student-info {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          border-left: 4px solid #4f46e5;
        }
        
        .student-info h2 {
          color: #1e293b;
          margin-bottom: 15px;
          font-size: 20px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .info-label {
          font-weight: 600;
          color: #475569;
        }
        
        .info-value {
          color: #1e293b;
          font-weight: 500;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .summary-card {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        
        .summary-card.average { border-color: #10b981; }
        .summary-card.gpa { border-color: #4f46e5; }
        .summary-card.rank { border-color: #8b5cf6; }
        .summary-card.attendance { border-color: #f59e0b; }
        
        .summary-card h3 {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          color: #64748b;
        }
        
        .summary-card .value {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .summary-card.average .value { color: #10b981; }
        .summary-card.gpa .value { color: #4f46e5; }
        .summary-card.rank .value { color: #8b5cf6; }
        .summary-card.attendance .value { color: #f59e0b; }
        
        .summary-card .subtitle {
          font-size: 12px;
          color: #64748b;
        }
        
        .subjects-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .subjects-table th {
          background: #4f46e5;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        
        .subjects-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .subjects-table tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .status-improved { background: #dcfce7; color: #166534; }
        .status-declined { background: #fef2f2; color: #dc2626; }
        .status-stable { background: #f1f5f9; color: #475569; }
        .status-strong { background: #fef3c7; color: #d97706; }
        
        .insights-section {
          background: #f0f9ff;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          border-left: 4px solid #0ea5e9;
        }
        
        .insights-section h3 {
          color: #0c4a6e;
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        .insights-text {
          color: #0369a1;
          line-height: 1.7;
          margin-bottom: 15px;
        }
        
        .subject-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        
        .subject-tag {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .subject-tag.strong {
          background: #dcfce7;
          color: #166534;
        }
        
        .subject-tag.weak {
          background: #fef2f2;
          color: #dc2626;
        }
        
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          color: #64748b;
          font-size: 12px;
        }
        
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Student Evaluation Report</h1>
        <p>Comprehensive Academic Performance Analysis</p>
        <p>Generated on ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
      </div>

      <div class="student-info">
        <h2>Student Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Name:</span>
            <span class="info-value">${selectedStudent.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Class:</span>
            <span class="info-value">${selectedStudent.className}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Section:</span>
            <span class="info-value">${selectedStudent.section}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Roll Number:</span>
            <span class="info-value">${selectedStudent.rollNo || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Symbol Number:</span>
            <span class="info-value">${selectedStudent.symbolNo || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Academic Year:</span>
            <span class="info-value">${selectedStudent.academicYear || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-card average">
          <h3>Average Score</h3>
          <div class="value">${dashboard.summary.averages[dashboard.summary.averages.length - 1]?.average || 'N/A'}%</div>
          <div class="subtitle">Latest Term</div>
        </div>
        <div class="summary-card gpa">
          <h3>GPA</h3>
          <div class="value">${dashboard.summary.averages[dashboard.summary.averages.length - 1]?.gpa?.toFixed(1) || 'N/A'}</div>
          <div class="subtitle">Grade: ${dashboard.summary.averages[dashboard.summary.averages.length - 1]?.grade || 'N/A'}</div>
        </div>
        <div class="summary-card rank">
          <h3>Class Rank</h3>
          <div class="value">#${dashboard.summary.averages[dashboard.summary.averages.length - 1]?.rank || 'N/A'}</div>
          <div class="subtitle">Out of ${dashboard.summary.averages[dashboard.summary.averages.length - 1]?.totalStudents || 'N/A'}</div>
        </div>
        <div class="summary-card attendance">
          <h3>Attendance</h3>
          <div class="value">${dashboard.attendance.percentage || 'N/A'}%</div>
          <div class="subtitle">${dashboard.attendance.present}/${dashboard.attendance.records} days</div>
        </div>
      </div>

      <table class="subjects-table">
        <thead>
          <tr>
            <th>Subject</th>
            ${selectedExams.map(exam => `<th>${exam.examName}</th>`).join('')}
            <th>Change</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${dashboard.subjects.map(subject => `
            <tr>
              <td><strong>${subject.subject}</strong></td>
              ${subject.stats.map(stat => `
                <td>${stat ? (mode === 'percentage' ? `${stat.percentage}%` : 
                             mode === 'gpa' ? stat.gpa?.toFixed(1) : 
                             mode === 'grade' ? stat.grade : 
                             stat.raw) : 'N/A'}</td>
              `).join('')}
              <td>${subject.change != null ? `${subject.change > 0 ? '+' : ''}${subject.change}` : 'N/A'}</td>
              <td><span class="status-badge status-${subject.status.toLowerCase()}">${subject.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="insights-section">
        <h3>AI Performance Analysis</h3>
        <div class="insights-text">${dashboard.summary.aiSummary}</div>
        
        ${dashboard.summary.strongSubjects.length > 0 ? `
          <div>
            <strong>Strong Subjects:</strong>
            <div class="subject-tags">
              ${dashboard.summary.strongSubjects.map(subject => 
                `<span class="subject-tag strong">${subject}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        ${dashboard.summary.weakSubjects.length > 0 ? `
          <div style="margin-top: 15px;">
            <strong>Areas for Improvement:</strong>
            <div class="subject-tags">
              ${dashboard.summary.weakSubjects.map(subject => 
                `<span class="subject-tag weak">${subject}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <p>This report was generated by the School Management System</p>
        <p>For questions about this report, please contact the academic office</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};

export const generateComparisonPDF = (dashboard1, dashboard2, student1, student2, selectedExams, mode) => {
  // Similar implementation for comparison PDF
  console.log('Comparison PDF generation would be implemented here');
};

export default {
  generateEvaluationPDF,
  generateComparisonPDF
};