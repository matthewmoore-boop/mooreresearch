"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-text-style/font-family";
import FontSize from "@tiptap/extension-text-style/font-size";
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

    const linkUrl = () => {
        const url = window.prompt('Enter a URL');
        if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    };

    const setColor = (color) => {
        editor.chain().focus().setColor(color).run();
    };

    const setHighlight = (color) => {
        editor.chain().focus().toggleHighlight({ color }).run();
    };

    const setFontFamily = (font) => {
        if (font) {
            editor.chain().focus().setFontFamily(font).run();
        }
    };

    const setFontSize = (size) => {
        if (size) {
            editor.chain().focus().setFontSize(`${size}px`).run();
        }
    };

    const clearFormatting = () => {
        editor.chain().focus().clearNodes().unsetAllMarks().run();
    };

    const insertImage = () => {
        const url = window.prompt('Image URL');
        if (url) {
            editor.chain().focus().setImage({ src: url, alt: 'Inserted image' }).run();
        }
    };

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run();
    };

    const addRow = () => {
        editor.chain().focus().addRow().run();
    };

    const addColumn = () => {
        editor.chain().focus().addColumn().run();
    };

    const deleteTable = () => {
        editor.chain().focus().deleteTable().run();
    };

    return (
        <div className="border border-gray-200 rounded-xl bg-slate-50 p-3 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-2 text-sm text-slate-600">
                <div className="rounded border border-gray-300 bg-white px-2 py-1 shadow-sm">
                    <span className="font-semibold mr-2">Clipboard</span>
                    {btn(() => editor.chain().focus().undo().run(), false, 'Undo')}
                    {btn(() => editor.chain().focus().redo().run(), false, 'Redo')}
                    {btn(clearFormatting, false, 'Clear Formatting')}
                </div>
                <div className="rounded border border-gray-300 bg-white px-2 py-1 shadow-sm">
                    <span className="font-semibold mr-2">Font</span>
                    {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'B')}
                    {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'I')}
                    {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'U')}
                    {btn(() => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'S')}
                    <select onChange={(e) => setFontFamily(e.target.value)} className="mr-2 px-2 py-1 rounded bg-gray-100">
                        <option value="">Font</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                    </select>
                    <select onChange={(e) => setFontSize(e.target.value)} className="px-2 py-1 rounded bg-gray-100">
                        <option value="">Size</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="16">16</option>
                        <option value="18">18</option>
                        <option value="24">24</option>
                        <option value="32">32</option>
                    </select>
                    {btn(() => setColor('#e63946'), false, 'Red')}
                    {btn(() => setColor('#1d3557'), false, 'Blue')}
                    {btn(() => setHighlight('#ffe066'), false, 'Highlight')}
                </div>
                <div className="rounded border border-gray-300 bg-white px-2 py-1 shadow-sm">
                    <span className="font-semibold mr-2">Paragraph</span>
                    {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), 'H1')}
                    {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'H2')}
                    {btn(() => editor.chain().focus().setParagraph().run(), editor.isActive('paragraph'), 'Normal')}
                    {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), '• List')}
                    {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), '1. List')}
                </div>
                <div className="rounded border border-gray-300 bg-white px-2 py-1 shadow-sm">
                    <span className="font-semibold mr-2">Alignment</span>
                    {btn(() => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), 'Left')}
                    {btn(() => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), 'Center')}
                    {btn(() => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), 'Right')}
                    {btn(() => editor.chain().focus().setTextAlign('justify').run(), editor.isActive({ textAlign: 'justify' }), 'Justify')}
                </div>
                <div className="rounded border border-gray-300 bg-white px-2 py-1 shadow-sm">
                    <span className="font-semibold mr-2">Insert</span>
                    {btn(linkUrl, editor.isActive('link'), 'Link')}
                    {btn(insertImage, false, 'Image')}
                    {btn(insertTable, false, 'Table')}
                    {btn(addRow, false, 'Add Row')}
                    {btn(addColumn, false, 'Add Col')}
                    {btn(deleteTable, false, 'Del Table')}
                    {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Quote')}
                    {btn(() => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'), '</>')}
                </div>
            </div>
            <div className="flex justify-end">
                <button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-4 rounded-lg shadow-sm">
                    Save to Database
                </button>
            </div>
        </div>
    );
}

function CollaborativeEditor() {
    const [docId, setDocId] = useState(null);
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ history: false }),
            Placeholder.configure({ placeholder: 'Start writing...' }),
            Collaboration.configure({ document: new Y.Doc() }),
            Underline,
            Link.configure({ openOnClick: false }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle.configure({ types: ['textStyle'] }),
            FontFamily.configure({ types: ['textStyle'] }),
            FontSize.configure({ types: ['textStyle'] }),
            Color.configure({ types: ['textStyle'] }),
            Highlight.configure({ multicolor: true }),
            Image.configure({ inline: false, allowBase64: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: '<p>Start typing...</p>',
    });

    useEffect(() => {
        const DOCUMENT_ID_TO_LOAD = "c63d1b04-aadf-4251-871a-bc5a7da82fe8";

        async function loadDocument() {
            const { data, error } = await supabase
                .from('documents')
                .select('id, content_json')
                .eq('id', DOCUMENT_ID_TO_LOAD)
                .single();

            if (error || !data) {
                console.error('Failed to load document:', error);
                return;
            }

            setDocId(data.id);

            if (editor) {
                editor.commands.setContent(data.content_json);
            }
        }

        if (editor) {
            loadDocument();
        }
    }, [editor]);

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
