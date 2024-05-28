// import * as XLSX from 'xlsx';

// export function parseExcelFile(
//   file: File | Uint8Array,
//   maxSectionLength = 2000
// ): Promise<any[]> {
//   return new Promise((resolve, reject) => {
//     try {
//       const workbook = XLSX.read(file, { type: file instanceof File ? 'file' : 'buffer' });
//       const sheetnames = workbook.SheetNames;
//       console.log("Sheetnames:" , sheetnames);

//       const allSheetContents = [];
  
//       for (const sheets of sheetnames) {
//         const worksheet = workbook.Sheets[sheets];
//         const content = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
//         // console.log(`Contents for '${sheets}':`, content )
//         console.log("Content length: ", content.length);

//         if (content.length < maxSectionLength){
//           console.log("Contents not being chunked");
//           allSheetContents.push(...content);
//         }
//         else{
//           console.log("Starting the chunking process");
//           const numberChunks = Math.ceil(content.length / maxSectionLength);
//           const chunkSize = Math.ceil(content.length / numberChunks);
//           const chunks = [];

//           for (let i = 0; i < numberChunks; i++) {
//             chunks.push(content.slice(i * chunkSize, (i + 1) * chunkSize));
//           }
//           allSheetContents.push(...chunks.flat());
          
//         }
//       }      
      
//       return resolve(allSheetContents.map((column) => ({
//         content: column,
//       })));
      
//     } catch (error) {
//       reject(error);
//     }
//   });
// }


import * as XLSX from "xlsx";

export function parseExcelFile(
  file: File | Uint8Array, 
  maxSectionLength = 2000
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(file, { type: file instanceof File ? 'file' : 'buffer' });
      const sheetnames = workbook.SheetNames;
      console.log("Sheetnames:", sheetnames);
      const allSheetContents: any[] = [];

      for (const sheetName of sheetnames) {
        const worksheet = workbook.Sheets[sheetName];
        const content = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: worksheet['!ref'] }) as any[][];

        const maxColCount = content[0].length;

        for (let colIndex = 0; colIndex < maxColCount; colIndex++) {
          const column = content.map(row => row[colIndex] ?? '');

          if (column.length < maxSectionLength) {
            console.log("Column not being chunked length: ", column.length);
            allSheetContents.push(column);
          } else {
            console.log("Starting the chunking process for column");
            const numberChunks = Math.ceil(column.length / maxSectionLength);
            const chunkSize = Math.ceil(column.length / numberChunks);
            const chunks = [];
            for (let i = 0; i < numberChunks; i++) {
              chunks.push(column.slice(i * chunkSize, (i + 1) * chunkSize));
            }
            allSheetContents.push(...chunks);
          }
        }
      }

      return resolve(allSheetContents.map(column => ({ content: column })));
    } catch (error) {
      reject(error);
    }
  });
}