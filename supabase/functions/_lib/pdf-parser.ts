import * as pdfj from "pdfjs";
// import { GlobalWorkerOptions } from "pdfjs";
import { pdfjsWorker } from "npm:pdf-dist/build/pdf.worker.entry";

export async function parsePdfFile(
  file: File | Uint8Array,
  maxSectionLength = 2000
): Promise<{ content: string;}[]> {

  pdfj.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  // Load the PDF document
  console.log("Loading PDF...");
  const data = file instanceof File ? await file.arrayBuffer() : file;
  console.log("PDF data  loaded", data);

  console.log("Creating blob");
  const pdfBlob = new Blob([data], {type: "application/pdf"});
  console.log("Blob created successfully");

  console.log("Creating url");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  console.log("URL created successfully");

  

  console.log("Loading document data")
  const pdfDoc = await pdfj.getDocument(pdfUrl).promise;
  console.log("Document loaded successfully")

  // Extract text content from the PDF document
  console.log("Extracting text from PDF...");
  const pageTexts = await Promise.all(
    Array.from({ length: pdfDoc.numPages }, async (_, i) => {
      const page = await pdfDoc.getPage(i + 1);
      const textContent = await page.getTextContent();
      return textContent.items.map((item) => {
        return item.str;
      }).join(' ');
    })
  );
  console.log("Text extrcted successfully")
  const content = pageTexts.join('\n');

  // Chunk the content if it exceeds maxSectionLength
  const sections: {
    content: string;
  }[] = [];

  if (content.length > maxSectionLength) {
    const numberChunks = Math.ceil(content.length / maxSectionLength);
    const chunkSize = Math.ceil(content.length / numberChunks);

    for (let i = 0; i < numberChunks; i++) {
      sections.push({
        content: content.substring(i * chunkSize, (i + 1) * chunkSize),
        // heading: undefined,
        // part: i + 1,
        // total: numberChunks,
      });  
    }
  } else {
    sections.push({ content, /*heading: undefined*/ });
  }

  URL.revokeObjectURL(pdfUrl);
  return sections;
}

// import { pdfToText } from "npm:pdf-ts";
// import fs from 'node:fs/promises';

// export async function parsePdfFile(
//     file: string,
//     maxSectionLength = 2000
//   ): Promise<{ content: string;}[]> {
//     const pdf = await fs.readFile(file);
//     const content = await pdfToText(pdf);

//     const sections: {
//       content: string;
//     }[] =[];

//     if (content.length > maxSectionLength){
//       const numberChunks = Math.ceil(content.length/ maxSectionLength)
//       const chunks = Math.ceil(content.length/numberChunks)
      
//       for (let i = 0; i < numberChunks; i ++){
//         sections.push({
//           content : content.substring( i * chunks, (i+1) * chunks)
//         });
//       }
//     }
//     else {
//       sections.push({content});
//     }

//     return sections;
 
//   }