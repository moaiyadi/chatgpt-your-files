// import { createClient } from '@supabase/supabase-js';
// import { Database } from '../_lib/database.ts';
// import { processMarkdown } from '../_lib/markdown-parser.ts';

// const supabaseUrl = Deno.env.get('SUPABASE_URL');
// const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

// Deno.serve(async (req) => {
//   if (!supabaseUrl || !supabaseAnonKey) {
//     return new Response(
//       JSON.stringify({
//         error: 'Missing environment variables.',
//       }),
//       {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' },
//       }
//     );
//   }

//   const authorization = req.headers.get('Authorization');

//   if (!authorization) {
//     return new Response(
//       JSON.stringify({ error: `No authorization header passed` }),
//       {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' },
//       }
//     );
//   }

//   const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
//     global: {
//       headers: {
//         authorization,
//       },
//     },
//     auth: {
//       persistSession: false,
//     },
//   });

//   const { document_id } = await req.json();

//   const { data: document } = await supabase
//     .from('documents_with_storage_path')
//     .select()
//     .eq('id', document_id)
//     .single();

//   if (!document?.storage_object_path) {
//     return new Response(
//       JSON.stringify({ error: 'Failed to find uploaded document' }),
//       {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' },
//       }
//     );
//   }

//   const { data: file } = await supabase.storage
//     .from('files')
//     .download(document.storage_object_path);

//   if (!file) {
//     return new Response(
//       JSON.stringify({ error: 'Failed to download storage object' }),
//       {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' },
//       }
//     );
//   }

//   const fileContents = await file.text();
//   const processedMd = processMarkdown(fileContents);

//   const { error } = await supabase.from('document_sections').insert(
//     processedMd.sections.map(({ content }) => ({
//       document_id,
//       content,
//     }))
//   );

//   if (error) {
//     console.error(error);
//     return new Response(
//       JSON.stringify({ error: 'Failed to save document sections' }),
//       {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' },
//       }
//     );
//   }

//   console.log(
//     `Saved ${processedMd.sections.length} sections for file '${document.name}'`
//   );

//   return new Response(null, {
//     status: 204,
//     headers: { 'Content-Type': 'application/json' },
//   });
// });

import { createClient } from '@supabase/supabase-js';
import { Database } from '../_lib/database.ts';
import { Section, processMarkdown } from '../_lib/markdown-parser.ts';
import { parseExcelFile } from "../_lib/excel-parser.ts";
import { /*chunkContent,*/ parsePdfFile } from '../_lib/pdf-parser.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

Deno.serve(async (req) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({
        error: 'Missing environment variables.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const authorization = req.headers.get('Authorization');

  if (!authorization) {
    return new Response(
      JSON.stringify({ error: `No authorization header passed` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        authorization,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  const { document_id } = await req.json();

  const { data: document } = await supabase
    .from('documents_with_storage_path')
    .select()
    .eq('id', document_id)
    .single();

  if (!document?.storage_object_path) {
    return new Response(
      JSON.stringify({ error: 'Failed to find uploaded document' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { data: file } = await supabase.storage
    .from('files')
    .download(document.storage_object_path);

  if (!file) {
    return new Response(
      JSON.stringify({ error: 'Failed to download storage object' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // const fileContents = await file;
  let sections : Section[];

  if (document.name && (document.name.endsWith('.md') || document.name.endsWith('.markdown')))
  {
    const fileContents = await file.text();
    const processedMd = processMarkdown(fileContents);

    const { error } = await supabase.from('document_sections').insert(
      processedMd.sections.map(({ content }) => ({
        document_id,
        content,
      }))
    );

    if (error) {
      console.error(error);
      return new Response(
        JSON.stringify({ error: 'Failed to save document sections' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Saved ${processedMd.sections} sections for file '${document.name}'`
    );
  }
  else if (document.name && (document.name.endsWith('.xlsx') || document.name.endsWith('.xls')))
    {
      const buffer = await file.arrayBuffer();
      const fileContents = new Uint8Array(buffer);

      const processedExcel = await parseExcelFile(fileContents);
      sections = processedExcel.map((column) => ({
        content: JSON.stringify(column),
      }));

      const { error } = await supabase.from('document_sections').insert(
        sections.map(( {content} ) => ({
          document_id,
          content,
        }))
      );

      if (error) {
        console.error(error);
        return new Response(
          JSON.stringify({ error: 'Failed to save document sections' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
  
      console.log(
        `Saved ${processedExcel} sections for file '${document.name}'`
      );
    }
  else if (document.name && (document.name.endsWith('.pdf') || document.name.endsWith('.PDF'))){
    console.log("Sending PDF file to parse")
    const fileArrayBuffer = await file.arrayBuffer();
    const fileContents = new Uint8Array(fileArrayBuffer);

    const processedPdf = await parsePdfFile(fileContents);
    // const chunked = await chunkContent(processedPdf);
    // sections = chunked.map((chunk) => ({
    //   content: JSON.stringify(chunk),
    // }))
    sections = processedPdf.map((row) => ({
      content: JSON.stringify(row),
    }));
    console.log("Index section: ", sections);
    
    console.log("PDF file parsed successfully")
    const { error } = await supabase.from('document_sections').insert(
      sections.map(( {content} ) => ({
        document_id,
        content,
      }))
    );
    


    if (error) {
      console.error(error);
      return new Response(
        JSON.stringify({ error: 'Failed to save document sections' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Saved ${processedPdf} sections for file '${document.name}'`
    );
  }
  

  return new Response(null, {
    status: 204,
    headers: { 'Content-Type': 'application/json' },
  });
});
