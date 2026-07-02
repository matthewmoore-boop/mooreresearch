'use client'

 

import { useEditor, EditorContent } from '@tiptap/react'

import StarterKit from '@tiptap/starter-kit'

import { createClient } from '@supabase/supabase-js'

import { useEffect, useState } from 'react'

 

// 1. Initialize the Supabase client

const supabase = createClient(

  process.env.NEXT_PUBLIC_SUPABASE_URL,

  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

)

 

// The toolbar component remains the same

const MenuBar = ({ editor }) => {

  if (!editor) { return null }

  return (

    <div className="flex space-x-2 p-2 bg-gray-100 border-b border-gray-300">

      {/* ... (buttons for Bold, Italic, H1) ... */}

       <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'p-1 bg-gray-300 rounded' : 'p-1'}>Bold</button>

       <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'p-1 bg-gray-300 rounded' : 'p-1'}>Italic</button>

       <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'p-1 bg-gray-300 rounded' : 'p-1'}>H1</button>

    </div>

  )

}

 

// The main page component

export default function Home() {

  const [docId, setDocId] = useState(null);

 

  const editor = useEditor({

    extensions: [ StarterKit ],

    content: `<p>Loading document...</p>`, // Initial placeholder

    editorProps: {

      attributes: { class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl p-5 focus:outline-none min-h-[300px]' },

    },

  })

 

   // 2. Fetch the SPECIFIC document from Supabase when the component mounts

  useEffect(() => {

    // ---- PASTE YOUR DOCUMENT ID HERE ----

    const DOCUMENT_ID_TO_LOAD = "your-document-id-from-supabase";

    // -------------------------------------

 

    async function loadDocument() {

      const { data, error } = await supabase

        .from('documents')

        .select('id, content_json')

        .eq('id', 'c63d1b04-aadf-4251-871a-bc5a7da82fe8') // We now ask for a specific document

        .single(); // This will now work correctly

 

      if (data && editor) {

        setDocId(data.id);

        editor.commands.setContent(data.content_json);

      } else if (error) {

        let errorMessage = error.message;

        if (error.code === 'PGRST116') {

             errorMessage = "The document ID was not found. Please check the ID in your code."

        }

        editor.commands.setContent(`<p>Error loading document: ${errorMessage}</p>`);

      } else {

        editor.commands.setContent(`<p>Error: Document with ID not found.</p>`);

      }

    }

    if (editor) {

      loadDocument();

    }

  }, [editor])

 

  // 3. Save the document back to Supabase

  const handleSave = async () => {

    if (editor && docId) {

      const json = editor.getJSON();

      const { error } = await supabase

        .from('documents')

        .update({ content_json: json, updated_at: new Date().toISOString() })

        .eq('id', docId)

 

      if (error) {

        alert('Error saving document: ' + error.message)

      } else {

        alert('Document saved successfully!')

      }

    }

  }

 

  return (

    <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">

      <div className="flex justify-between items-center p-2 bg-gray-100 border-b">

        <MenuBar editor={editor} />

        <button onClick={handleSave} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded">

          Save

        </button>

      </div>

      <EditorContent editor={editor} />

    </div>

  )

}

 