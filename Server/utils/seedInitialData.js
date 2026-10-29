import AcademicYear from '../model/AcademicYearModel.js';
import ClassModel from '../model/ClassModel.js';

const defaultClasses = [
  { className: 'NURSERY', order: 1, sections: [] },
  { className: 'KG', order: 2, sections: [] },
  { className: 'ONE', order: 3, sections: [] },
  { className: 'TWO', order: 4, sections: [] },
  { className: 'THREE', order: 5, sections: [] },
  { className: 'FOUR', order: 6, sections: [] },
  { className: 'FIVE', order: 7, sections: [] },
  { className: 'SIX', order: 8, sections: ['A', 'B'] },
  { className: 'SEVEN', order: 9, sections: ['A', 'B'] },
  { className: 'EIGHT', order: 10, sections: ['A', 'B'] },
  { className: 'NINE', order: 11, sections: ['A', 'B'] },
  { className: 'TEN', order: 12, sections: ['A', 'B'] },
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
  for (const classData of defaultClasses) {
    const insertFields = {
      className: classData.className,
      order: classData.order,
      description: `${classData.className} class`,
    };
    if (classData.order < 8) insertFields.sections = classData.sections;

    const result = await ClassModel.updateOne(
      { className: classData.className },
      {
        $setOnInsert: insertFields,
        ...(classData.order >= 8 ? { $set: { sections: ['A', 'B'] } } : {}),
      },
      { upsert: true },
    );
    if (result.upsertedCount) console.log(`Created class: ${classData.className}`);
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
