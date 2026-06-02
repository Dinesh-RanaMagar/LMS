import AcademicYear from '../model/AcademicYearModel.js';
import ClassModel from '../model/ClassModel.js';

const defaultClasses = [
  { className: 'Nursery', order: 1, sections: [] },
  { className: 'KG', order: 2, sections: [] },
  { className: 'Class 1', order: 3, sections: [] },
  { className: 'Class 2', order: 4, sections: [] },
  { className: 'Class 3', order: 5, sections: [] },
  { className: 'Class 4', order: 6, sections: [] },
  { className: 'Class 5', order: 7, sections: [] },
  { className: 'Class 6', order: 8, sections: ['A', 'B'] },
  { className: 'Class 7', order: 9, sections: ['A', 'B'] },
  { className: 'Class 8', order: 10, sections: ['A', 'B'] },
  { className: 'Class 9', order: 11, sections: ['A', 'B'] },
  { className: 'Class 10', order: 12, sections: ['A', 'B'] },
];

const getDefaultAcademicYearName = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

const createDefaultAcademicYear = async () => {
  const count = await AcademicYear.countDocuments();
  if (count > 0) return;

  const yearName = getDefaultAcademicYearName();

  await AcademicYear.create({
    yearName,
    dateFormat: 'AD',
    isActive: true,
  });

  console.log(`Created default academic year: ${yearName}`);
};

const createDefaultClasses = async () => {
  const count = await ClassModel.countDocuments();
  if (count > 0) return;

  for (const classData of defaultClasses) {
    await ClassModel.create({
      ...classData,
      description: `${classData.className} class`,
    });
    console.log(`Created class: ${classData.className}`);
  }
};

export const seedInitialData = async () => {
  try {
    await createDefaultAcademicYear();
    await createDefaultClasses();
  } catch (error) {
    console.error('Initial data seeding error:', error);
  }
};
