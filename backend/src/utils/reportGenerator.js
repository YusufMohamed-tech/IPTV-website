import { Parser } from "json2csv";
import PDFDocument from "pdfkit";

export const generateCsv = (rows, fields) => {
  const parser = new Parser({ fields });
  return parser.parse(rows);
};

export const generatePdfBuffer = (title, rows) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 32 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();

    rows.forEach((row, index) => {
      doc.fontSize(11).text(`${index + 1}. ${JSON.stringify(row)}`);
      doc.moveDown(0.5);
    });

    doc.end();
  });
