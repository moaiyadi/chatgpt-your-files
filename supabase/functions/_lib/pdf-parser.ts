import { getDocument } from 'npm:pdfjs-dist';
import { PDFPageProxy, TextItem, TextMarkedContent } from 'npm:pdfjs-dist/build';

/**
 * Given a PDF, extract and return its text content.
 *
 * @param pdf A buffer containing the PDF contents.
 * @param options
 * @param options.pageSep Optionally specifiy the string used to join pages.
 * @param options.nodeSep Optionally specifiy the string used to join nodes in the document.
 * @returns A string containing the PDF converted to text.
 */
export async function parsePdfFile(
  pdf: Buffer | Uint8Array,
  options?: { pageSep?: string; nodeSep?: string },
): Promise<string[]> {
  console.log("extracting pages");
  const pages = await pdfToPages(pdf, options);
  console.log("pages extracted");
  return pages.map((page) => page.text);
  // const pageSep = getStringOptionOrDefault((options || {}).pageSep, '\n');
  // const fullText = pages.map((page) => page.text).join(pageSep);
  // return fullText.split(pageSep);
}

export type PageType = {
  page: number;
  text: string;
};

/**
 * Given a PDF, extract and return its pages as a list.
 *
 * @param pdf A buffer containing the PDF contents.
 * @param options
 * @param options.nodeSep Optionally specifiy the string used to join nodes in the document.
 * @returns A list of pages objects containing the page number and text content.
 */
export async function pdfToPages(
  pdf: Buffer | Uint8Array,
  options?: { nodeSep?: string },
): Promise<PageType[]> {
  console.log("Type of pdf:", typeof pdf);

  const document = await getDocument({
    data: pdf,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const numPages = document.numPages;

  const pages: PageType[] = []; 

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await document.getPage(pageNum);
      try {
        // const nodeSep = getStringOptionOrDefault((options || {}).nodeSep, '\n');
        const text = await extractTextFromPage(page);
        pages.push({ page: pageNum, text: text });
      } catch (error) {
        throw error;
      } finally {
        page.cleanup();
      }
    }
  } catch (error) {
    throw error;
  } finally {
    document.destroy();
  }

  return pages;
}

/**
 * Splits the text content into chunks based on a maximum section length.
 *
 * @param content The text content to be chunked.
 * @param maxSectionLength The maximum length of each chunk.
 * @returns An array of chunks, each containing a portion of the text content.
 */

export async function chunkContent(
  content: string,
  maxSectionLength = 2000
): Promise<string[]> {
  if (content.length <= maxSectionLength) {
    return [content];
  }

  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += maxSectionLength) {
    chunks.push(content.slice(i, i + maxSectionLength));
  }

  return chunks;
}

async function extractTextFromPage(page: PDFPageProxy, sep?: string) {
  const content = await page.getTextContent();
  return getTextItems(content.items)
    .map((item) => item.str)
    .join(' ');
}

function getTextItems(items: Array<TextItem | TextMarkedContent>): TextItem[] {
  return items.filter((item: any) => typeof (item as TextItem).str === 'string') as TextItem[];
}

function getStringOptionOrDefault(option: string | undefined, optionDefault: string) {
  return typeof option === 'string' ? option : optionDefault;
}

function normalizeBuffer(buffer: Buffer | Uint8Array) {
  return buffer instanceof Buffer ? buffer: Buffer.from(buffer);
} 