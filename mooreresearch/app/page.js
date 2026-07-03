"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const colors = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

function MenuBar({ editor, onSave }) {
    if (!editor) return null;

    const buttonClass = (active) =>
        `mr-2 px-2 py-1 rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100"}`;

    const btn = (onClick, active, label) => (
        <button type="button" onClick={onClick} className={buttonClass(active)}>
            {label}
        </button>
    );

    return (
        <div className="flex justify-end border-b pb-2 mb-2">
            <button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-4 rounded-lg shadow-sm">
                Save to Database
            </button>
        </div>
    );
}

function CollaborativeEditor() {
    const [editor, setEditor] = useState(null);
    const [docId, setDocId] = useState(null);
    const [currentUser] = useState({
        name: 'User ' + Math.floor(Math.random() * 100),
        color: getRandomColor(),
    });

    useEffect(() => {
        let provider = null;
        let ydoc = null;
        let localEditor = null;

        const DOCUMENT_ID_TO_LOAD = "c63d1b04-aadf-4251-871a-bc5a7da82fe8";

        async function initialize() {
            // 1. Fetch data from Supabase first
            const { data, error } = await supabase
                .from('documents')
                .select('id, content_json')
                .eq('id', DOCUMENT_ID_TO_LOAD)
                .single();

            if (error || !data) {
                console.error("Failed to load document:", error);
                return;
            }
           
            setDocId(data.id);

            // 2. Initialize Yjs and provider
            ydoc = new Y.Doc();
            provider = new WebsocketProvider('wss://demos.yjs.dev', `mooreresearch-collab-room-${data.id}`, ydoc);
           
            // 3. Create the TipTap editor instance
            localEditor = new useEditor({
                extensions: [
                    StarterKit.configure({ history: false }),
                    Placeholder.configure({ placeholder: 'Start writing your research note...' }),
                    Collaboration.configure({ document: ydoc }),
                    CollaborationCursor.configure({ provider: provider, user: currentUser }),
                    Underline,
                    Link.configure({ openOnClick: false }),
                    TextAlign.configure({ types: ['heading', 'paragraph'] }),
                    TextStyle,
                    Color.configure({ types: ['textStyle'] }),
                    Highlight.configure({ multicolor: true }),
                    Image.configure({ inline: false, allowBase64: true }),
                    Table.configure({ resizable: true }),
                    TableRow,
                    TableHeader,
                    TableCell,
                ],
                // Set the initial content AFTER the editor is created
                content: data.content_json || '<p>Start typing...</p>',
            });
           
            setEditor(localEditor);
        }

        initialize();

        // Cleanup function
        return () => {
            provider?.destroy();
            ydoc?.destroy();
            localEditor?.destroy();
        };
    }, []);

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
           {editor ? (
             <div className="p-4">
                <MenuBar editor={editor} onSave={handleSave} />
                <div className="p-5 min-h-[300px] bg-white rounded">
                    <EditorContent editor={editor} />
                </div>
            </div>
           ) : (
             <div>Loading editor...</div>
           )}
        </div>
    );
}

export default function Page() {
    return <CollaborativeEditor />;
}