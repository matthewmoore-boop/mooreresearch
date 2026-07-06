'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import * as Y from 'yjs';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import { useSelf, useOthers } from '@liveblocks/react/suspense';
import { useEffect, useState } from 'react';

// This is the full editor component that uses Liveblocks hooks.
export function CollaborativeEditor() {
    const [doc, setDoc] = useState(null);
    const [provider, setProvider] = useState(null);
    const userInfo = useSelf((me) => me.info);
    const others = useOthers();

    const editor = useEditor({
        editorProps: {
            attributes: { class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl p-5 focus:outline-none min-h-[300px]' },
        },
    });

    useEffect(() => {
        const yDoc = new Y.Doc();
        const yProvider = new LiveblocksYjsProvider(yDoc, { room: "apex-research-demo-room" });
        setDoc(yDoc);
        setProvider(yProvider);
       
        if (editor) {
            editor.setOptions({
                extensions: [
                    // Enable history for undo/redo controls while still using Collaboration
                    StarterKit.configure({ history: true }),
                    Underline,
                    TextAlign.configure({ types: ['heading', 'paragraph'] }),
                    Collaboration.configure({ document: yDoc }),
                ],
                content: '<p>Start writing...</p>',
            });
        }
        return () => {
          yDoc?.destroy();
          yProvider?.destroy();
        };
    }, [editor, userInfo]);

    function Toolbar({ editor }) {
        if (!editor) return null;

        const Btn = ({ onClick, active, title, children }) => (
            <button
                type="button"
                onClick={onClick}
                title={title}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${active ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            >
                {children}
            </button>
        );

        return (
            <div className="flex items-center gap-2 p-2 border-b bg-white dark:bg-black rounded-t-lg">
                <div className="flex items-center gap-1 border rounded-md px-1 py-1 bg-gray-50 dark:bg-gray-900">
                    <Btn
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        title="Bold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.25 10.5A3.25 3.25 0 1110 4h2.25A3.25 3.25 0 1113.25 10.5zM6 4h3a2 2 0 012 2v1a2 2 0 01-2 2H6V4zM6 10h3a2 2 0 012 2v1a2 2 0 01-2 2H6v-5z"/></svg>
                    </Btn>
                    <Btn
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Italic"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 italic" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4v2h2.5l-3 8H4v2h8v-2h-2.5l3-8H16V4H7z"/></svg>
                    </Btn>
                    <Btn
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        title="Underline"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 3a1 1 0 011-1h8a1 1 0 011 1v6a4 4 0 11-8 0V4H6v5a5 5 0 0010 0V3a3 3 0 00-3-3H6a3 3 0 00-3 3v9h2V3z" clipRule="evenodd"/></svg>
                    </Btn>
                </div>

                <div className="flex items-center gap-1">
                    <select
                        value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : 'p'}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === 'p') editor.chain().focus().setParagraph().run();
                            if (v === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
                            if (v === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                        }}
                        className="text-sm p-1 rounded border"
                        title="Style"
                    >
                        <option value="p">Normal</option>
                        <option value="h1">Heading 1</option>
                        <option value="h2">Heading 2</option>
                    </select>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                    <Btn
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        title="Bulleted list"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 6h12v2H4V6zm0 6h12v2H4v-2zM2 6.5a1 1 0 112 0 1 1 0 01-2 0zm0 6a1 1 0 112 0 1 1 0 01-2 0z"/></svg>
                    </Btn>
                    <Btn
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        title="Numbered list"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 6h12v2H4V6zm0 6h12v2H4v-2zM3 6.5h-.5v1H3v-1zm0 6h-.5v1H3v-1zM1 8h1v1H1V8zm0 6h1v1H1v-1z"/></svg>
                    </Btn>
                </div>

                <div className="flex items-center gap-1">
                    <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14v2H3V4zm0 4h10v2H3V8zm0 4h14v2H3v-2z"/></svg>
                    </Btn>
                    <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14v2H3V4zm3 4h8v2H6V8zm-3 4h14v2H3v-2z"/></svg>
                    </Btn>
                    <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14v2H3V4zm4 4h10v2H7V8zm-4 4h14v2H3v-2z"/></svg>
                    </Btn>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">
            <div className="p-2 text-sm text-gray-500">
                Users online: {others.length + 1}
            </div>
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
}
