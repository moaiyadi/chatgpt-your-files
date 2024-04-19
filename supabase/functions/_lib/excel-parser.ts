import * as XLSX from 'xlsx';

export function parseExcelFile(
  file: File | Buffer,
  maxSectionLength = 2500
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(file, { type: file instanceof File ? 'file' : 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const content = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (content.length > maxSectionLength){
        const numberChunks = Math.ceil(content.length / maxSectionLength);
        const chunkSize = Math.ceil(content.length / numberChunks);
        const chunks = [];

        for (let i = 0; i < numberChunks; i++) {
          chunks.push(content.substring(i * chunkSize, (i + 1) * chunkSize));
        }
  
        return chunks.map((chunk, i) => ({
          content: chunk,
          heading,
          part: i + 1,
          total: numberChunks,
        }));
      }

      return resolve(content);
    } catch (error) {
      reject(error);
    }
  });
}