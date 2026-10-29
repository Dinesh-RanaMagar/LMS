export const isWorkspacePath = (pathname) => [
  '/dashboard',
  '/academic-years',
  '/students',
  '/classes',
  '/subjects',
  '/exams',
  '/evaluation',
  '/marks-entry',
  '/marksheets',
  '/reports',
  '/promotion',
  '/teachers',
  '/attendance',
  '/notices',
  '/settings',
].some((basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`));

export const getWorkspaceTabTitle = (pathname) => {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/academic-years') return 'Academic Years';
  if (pathname === '/students') return 'Students';
  if (pathname === '/students/add') return 'Add Student';
  if (pathname === '/students/import') return 'Import Students';
  if (pathname.startsWith('/students/edit/')) return 'Edit Student';
  if (pathname === '/classes' || pathname.startsWith('/classes/')) return 'Classes';
  if (pathname === '/subjects') return 'Subjects';
  if (pathname === '/exams') return 'Exams';
  if (pathname === '/exams/create') return 'Create Exam';
  if (pathname.startsWith('/exams/edit/')) return 'Edit Exam';
  if (/^\/exams\/[^/]+\/mark-setup$/.test(pathname)) return 'Exam Mark Setup';
  if (/^\/exams\/[^/]+$/.test(pathname)) return 'Exam Details';
  if (pathname === '/marks-entry') return 'Marks Entry';
  if (pathname === '/marksheets') return 'Marksheets';
  if (pathname === '/reports/tabulation') return 'Tabulation';
  if (pathname === '/reports/comparison') return 'Comparison';
  if (pathname === '/evaluation') return 'Evaluation';
  if (pathname === '/promotion') return 'Promotion';
  if (pathname === '/teachers') return 'Teachers';
  if (pathname === '/attendance') return 'Attendance';
  if (pathname === '/notices') return 'Notices';
  if (pathname === '/settings') return 'Settings';
  return 'Page';
};
