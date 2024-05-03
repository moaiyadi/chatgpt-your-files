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
import { processMarkdown } from '../_lib/markdown-parser.ts';
import { parseExcelFile } from '../_lib/excel-parser.ts';
import { parsePdfFile } from '../_lib/pdf-parser.ts';

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

  const fileContents = await file.text();
  let sections : Section[];

  if (document.name.endsWith('.md') || document.name.endsWith('.markdown'))
  {
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
      `Saved ${processedMd.sections.length} sections for file '${document.name}'`
    );
  }
  else if (document.name.endsWith('.xlsx') || document.name.endsWith('.xls'))
    {
      const processedExcel = await parseExcelFile(fileContents);
      sections = processedExcel.map((row) => ({
        content: JSON.stringify(row),
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
        `Saved ${processedExcel.sections.length} sections for file '${document.name}'`
      );
    }
  else if (document.name.endsWith('.pdf') || document.name.endsWith('.PDF')){
    console.log("Sending PDF file to parse")
    const processedPdf = await parsePdfFile(fileContents);
    
    console.log("PDF file parsed successfully")
    const {error} = await supabase.from('document_sections').insert(
      processedPdf.sections.map(( {content} ) => ({
        document_id,
        content
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
      `Saved ${processedPdf.sections.length} sections for file '${document.name}'`
    );
  }
  

  return new Response(null, {
    status: 204,
    headers: { 'Content-Type': 'application/json' },
  });
});
