import * as XLSX from 'xlsx';

export function parseExcelFile(
  file: File | Buffer,
  maxSectionLength = 2500
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(file, { type: file instanceof File ? 'file' : 'buffer' });
      const sheetnames = workbook.SheetNames;

      for (const sheets of sheetnames) {
        const worksheet = workbook.Sheets[sheets];
        const content = XLSX.utils.sheet_to_txt(worksheet);
        console.log(`Text contents for '${sheets}':`, content )

        if (content.length > maxSectionLength){
          const numberChunks = Math.ceil(content.length / maxSectionLength);
          const chunkSize = Math.ceil(content.length / numberChunks);
          const chunks = [];

          for (let i = 0; i < numberChunks; i++) {
            chunks.push(content.substring(i * chunkSize, (i + 1) * chunkSize));
          }
    
          return resolve(chunks.map((chunk, i) => ({
            content: chunk,
            part: i + 1,
            total: numberChunks,
          })));
        }

        return resolve(content);
      };
      
    } catch (error) {
      reject(error);
    }
  });
}