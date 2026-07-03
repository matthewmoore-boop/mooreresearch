"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import BubbleMenuExtension, { BubbleMenu } from "@tiptap/extension-bubble-menu";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const colors = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

function MenuBar({ editor, onSave }) {
    if (!editor) return null;
    return (
        <div className="flex justify-between items-center mb-3">
            <div>
                {/* Your formatting buttons here */}
            </div>
            <button onClick={onSave} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded">
                Save to Database
            </button>
        </div>
    );
}

function CollaborativeEditor() {
    const [docId, setDocId] = useState(null);
    const [editor, setEditor] = useState(null); // Editor state is now managed here
    const [currentUser] = useState({
        name: 'User ' + Math.floor(Math.random() * 100),
        color: getRandomColor(),
    });

    useEffect(() => {
        const DOCUMENT_ID_TO_LOAD = "c63d1b04-aadf-4251-871a-bc5a7da82fe8";

        async function initializeEditor() {
            // --- FIX 1: Fetch data from Supabase FIRST ---
            const { data: docData, error } = await supabase
                .from('documents')
                .select('id, content_json')
                .eq('id', DOCUMENT_ID_TO_LOAD)
                .single();

            if (error || !docData) {
                console.error("Failed to load document:", error);
                return;
            }

            setDocId(docData.id);

            // --- Now, initialize Yjs and the editor ---
            const ydoc = new Y.Doc();
            const provider = new WebsocketProvider("wss://demos.yjs.dev", `apex-room-${docData.id}`, ydoc);

            const newEditor = new useEditor({
                extensions: [
                    StarterKit.configure({ history: false }),
                    Placeholder.configure({ placeholder: 'Start writing...' }),
                    Collaboration.configure({ document: ydoc }),
                    CollaborationCursor.configure({
                        provider: provider,
                        user: currentUser,
                    }),
                ],
                // Set the editor's content with the data we fetched
                content: docData.content_json,
            });

            setEditor(newEditor);

            return () => {
                newEditor?.destroy();
                provider?.destroy();
                ydoc?.destroy();
            };
        }

        initializeEditor();
    }, []); // Run only once on mount

    const handleSave = async () => {
        if (editor && docId) {
            const json = editor.getJSON();
            const { error } = await supabase
                .from('documents')
                .update({ content_json: json, updated_at: new Date().toISOString() })
                .eq('id', docId);

            if (error) {
                alert('Error saving document: ' + error.message);
            } else {
                alert('Document saved successfully!');
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg relative">
            <div className="p-4">
                <MenuBar editor={editor} onSave={handleSave} />
                {editor ? (
                    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-lg rounded px-2 py-1 border border-gray-200">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className="mr-2 px-2 py-1 bg-gray-100 rounded"
                        >
                            B
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className="mr-2 px-2 py-1 bg-gray-100 rounded"
                        >
                            I
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className="mr-2 px-2 py-1 bg-gray-100 rounded"
                        >
                            H1
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className="mr-2 px-2 py-1 bg-gray-100 rounded"
                        >
                            •
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                            className="px-2 py-1 bg-gray-100 rounded"
                        >
                            {'</>'}
                        </button>
                    </BubbleMenu>
                ) : null}
                <div className="p-5 min-h-[300px] bg-white rounded">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}

// The main page component
export default function Page() {
    // We don't need the Liveblocks providers anymore for this Yjs setup
    return <CollaborativeEditor />;
}
