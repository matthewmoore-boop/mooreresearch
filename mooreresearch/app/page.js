'use client'

 

import { useEditor, EditorContent } from '@tiptap/react'

import StarterKit from '@tiptap/starter-kit'

 

// A basic toolbar component for Bold, Italic, etc.

const MenuBar = ({ editor }) => {

  if (!editor) {

    return null

  }

 

  return (

    <div className="flex space-x-2 p-2 bg-gray-100 border-b border-gray-300">

      <button

        onClick={() => editor.chain().focus().toggleBold().run()}

        disabled={!editor.can().chain().focus().toggleBold().run()}

        className={editor.isActive('bold') ? 'is-active' : ''}

      >

        Bold

      </button>

      <button

        onClick={() => editor.chain().focus().toggleItalic().run()}

        disabled={!editor.can().chain().focus().toggleItalic().run()}

        className={editor.isActive('italic') ? 'is-active' : ''}

      >

        Italic

      </button>

      <button

        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}

        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}

      >

        H1

      </button>

    </div>

  )

}

 

// The main page component

export default function Home() {

  const editor = useEditor({

    extensions: [

      StarterKit,

    ],

    content: `

      <h2>

        Welcome to Apex Research

      </h2>

      <p>

        This is your new, collaborative "Word-a-like" editor. You can start typing here...

      </p>

    `,

    editorProps: {

      attributes: {

        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none',

      },

    },

  })

 

  return (

    <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">

      <MenuBar editor={editor} />

      <EditorContent editor={editor} />

    </div>

  )

}