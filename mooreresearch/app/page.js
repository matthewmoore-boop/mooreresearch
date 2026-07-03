"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// Initialize the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// The MenuBar component with a new Save button
function MenuBar({ editor, onSave }) {
    if (!editor) return null;
    const btn = (onClick, active, label) => (
        <button
          type="button"
          onClick={onClick}
          className={`mr-2 px-2 py-1 rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100"}`}
        >
          {label}
        </button>
    );

    return (
        <div className="flex justify-between items-center mb-3">
            <div>
                {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), "B")}
                {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), "I")}
                {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }), "H1")}
                {/* ... Add other formatting buttons as needed ... */}
            </div>
            <button onClick={onSave} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded">
                Save to Database
            </button>
        </div>
    );
}

// The main editor component
function CollaborativeEditor() {
    const [docId, setDocId] = useState(null);

    // --- Real-time collaboration setup ---
    const roomName = "apex-research-demo-room";
    const ydoc = new Y.Doc();
    const provider = typeof window !== "undefined" ? new WebsocketProvider("wss://demos.yjs.dev", roomName, ydoc) : null;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ history: false }), // Use Yjs for history
            Collaboration.configure({ document: ydoc }),
            Placeholder.configure({ placeholder: 'Start typing your collaborative document...' }),
            BubbleMenuExtension,
        ],
    });

    // --- Database loading logic ---
    useEffect(() => {
        const DOCUMENT_ID_TO_LOAD = "c63d1b04-aadf-4251-871a-bc5a7da82fe8"; // Paste your test document ID

        async function loadDocument() {
            const { data, error } = await supabase
                .from('documents')
                .select('id, content_json')
                .eq('id', DOCUMENT_ID_TO_LOAD)
                .single();

            if (data && editor) {
                setDocId(data.id);
                // Convert the TipTap JSON to a Yjs fragment to load it
                const yFragment = Y.encodeStateAsUpdate(editor.state.doc.type.create(data.content_json).toJSON());
                Y.applyUpdate(ydoc, yFragment);

            } else if (error) {
                console.error("Error loading document:", error);
            }
        }
        if (editor) {
            loadDocument();
        }
    }, [editor]);

    // --- Database saving logic ---
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
