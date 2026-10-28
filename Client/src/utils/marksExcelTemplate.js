const xmlEscape = (value) => Array.from(String(value ?? ''))
  .filter((character) => {
    const code = character.codePointAt(0);
    return code === 0x9 || code === 0xA || code === 0xD
      || (code >= 0x20 && code <= 0xD7FF)
      || (code >= 0xE000 && code <= 0xFFFD)
      || (code >= 0x10000 && code <= 0x10FFFF);
  })
  .join('')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const textCell = (value, { style = 'header', mergeDown = false, mergeAcross = 0, index } = {}) => {
  const attributes = [
    `ss:StyleID="${style}"`,
    index === undefined ? '' : `ss:Index="${index}"`,
    mergeDown ? 'ss:MergeDown="1"' : '',
    mergeAcross ? `ss:MergeAcross="${mergeAcross}"` : '',
  ].filter(Boolean).join(' ');
  return `<Cell ${attributes}><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
};

const blankCell = (style = 'input') => `<Cell ss:StyleID="${style}"/>`;
const numberCell = (value, style = 'input') => `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${value}</Data></Cell>`;
const formulaCell = (formula, style = 'total') => `<Cell ss:StyleID="${style}" ss:Formula="${formula}"><Data ss:Type="Number">0</Data></Cell>`;

export const buildMarksExcelTemplate = ({ students, subjects }) => {
  const summaryHeaders = [
    'Total Obt. Mark',
    'Per.',
    'Rank in Class',
    'Rank in Sec.',
    'No. of failed Subject',
    'Grade',
    'GPA',
    'Att.',
  ];
  const summaryStart = 2 + (subjects.length * 3);

  const headerCells = [
    textCell('Roll No.', { mergeDown: true, index: 1 }),
    textCell('Name', { mergeDown: true, index: 2 }),
    ...subjects.map((subject, index) => textCell(subject.subjectName, {
      mergeAcross: 2,
      index: 3 + (index * 3),
    })),
    ...summaryHeaders.map((header, index) => textCell(header, {
      mergeDown: true,
      index: summaryStart + index + 1,
    })),
  ];
  const componentCells = [
    blankCell('subHeader'),
    blankCell('subHeader'),
    ...subjects.flatMap(() => [
      textCell('TH', { style: 'subHeader' }),
      textCell('INT', { style: 'subHeader' }),
      textCell('Total', { style: 'subHeader' }),
    ]),
    ...summaryHeaders.map(() => blankCell('subHeader')),
  ];

  const totalFullMarks = subjects.reduce((total, subject) => total + Number(subject.fullMarks || 0), 0);
  const studentRows = students.map((student) => {
    const cells = [
      textCell(student.rollNo, { style: 'body', index: 1 }),
      textCell(student.name, { style: 'body', index: 2 }),
    ];

    subjects.forEach((subject) => {
      cells.push(blankCell());
      cells.push(subject.hasPractical ? blankCell() : numberCell(0, 'locked'));
      cells.push(formulaCell('=RC[-2]+RC[-1]'));
    });

    const totalOffsets = subjects.map((_, subjectIndex) => {
      const totalColumn = 2 + (subjectIndex * 3) + 2;
      return `RC[${totalColumn - summaryStart}]`;
    });
    const totalFormula = `=SUM(${totalOffsets.join(',')})`;
    cells.push(formulaCell(totalFormula, 'body'));
    cells.push(formulaCell(`=IFERROR(RC[-1]/${Math.max(totalFullMarks, 1)}*100,0)`, 'body'));
    cells.push(...summaryHeaders.slice(2).map(() => blankCell('body')));
    return `<Row>${cells.join('')}</Row>`;
  });

  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header"><Font ss:Bold="1"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Interior ss:Color="#DCE6F1" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="subHeader"><Font ss:Bold="1"/><Alignment ss:Horizontal="Center"/><Interior ss:Color="#EAF0F6" ss:Pattern="Solid"/></Style>
    <Style ss:ID="body"><Alignment ss:Horizontal="Center"/></Style>
    <Style ss:ID="input"><Alignment ss:Horizontal="Center"/><Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/></Style>
    <Style ss:ID="locked"><Alignment ss:Horizontal="Center"/><Interior ss:Color="#E7E6E6" ss:Pattern="Solid"/></Style>
    <Style ss:ID="total"><Font ss:Bold="1"/><Alignment ss:Horizontal="Center"/><Interior ss:Color="#EAF0F6" ss:Pattern="Solid"/></Style>
  </Styles>
  <Worksheet ss:Name="Marks">
    <Table>
      <Row ss:Height="32">${headerCells.join('')}</Row>
      <Row>${componentCells.join('')}</Row>
      ${studentRows.join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`;

  return workbook;
};
