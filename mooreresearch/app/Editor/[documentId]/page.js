"use client";

import { useEffect, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { createClient } from '@supabase/supabase-js';
import {
    MdFormatBold,
    MdFormatItalic,
    MdFormatStrikethrough,
    MdFormatUnderlined,
    MdFormatListBulleted,
    MdFormatListNumbered,
    MdFormatAlignLeft,
    MdFormatAlignCenter,
    MdFormatAlignRight,
    MdImage,
    MdTableChart,
    MdLink,
    MdSave,
    MdSummarize,
} from 'react-icons/md';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const colors = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];
const DRAFT_STORAGE_KEY = 'mooreresearch-doc-draft';
//const DOCUMENT_ID_TO_LOAD = 'c63d1b04-aadf-4251-871a-bc5a7da82fe8';

function parseContentJson(value) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn('Unable to parse content_json from database', error);
            return null;
        }
    }
    return value;
}

function MenuBar({ editor, onSave, onCoPilotAction, copilotOpen, setCopilotOpen, coPilotLoading }) {
    if (!editor) return null;

    const buttonClass = (active) =>
        `mr-1 mb-1 p-2 rounded border flex items-center justify-center ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`;

    const btn = (onClick, active, label, Icon) => (
        <button type="button" onClick={onClick} className={buttonClass(active)} title={label}>
            {Icon ? <Icon className="h-4 w-4" /> : null}
        </button>
    );

    const aiOptions = [
        { key: 'summarize', label: 'Summarize' },
        { key: 'improve', label: 'Improve Writing' },
        { key: 'tone', label: 'Change Tone' },
        { key: 'table-commentary', label: 'Generate Table/Chart Commentary' },
    ];

    return (
        <div className="flex flex-wrap gap-2 border-b pb-3 mb-3">
            {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold', MdFormatBold)}
            {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic', MdFormatItalic)}
            {btn(() => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Strike', MdFormatStrikethrough)}
            {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline', MdFormatUnderlined)}
            {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), 'H1')}
            {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'H2')}
            {btn(() => editor.chain().focus().setParagraph().run(), editor.isActive('paragraph'), 'Paragraph')}
            {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet', MdFormatListBulleted)}
            {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered', MdFormatListNumbered)}
            {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Quote')}
            {btn(() => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), 'Left', MdFormatAlignLeft)}
            {btn(() => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), 'Center', MdFormatAlignCenter)}
            {btn(() => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), 'Right', MdFormatAlignRight)}
            {btn(() => editor.chain().focus().toggleHighlight({ color: '#FCEF6D' }).run(), editor.isActive('highlight'), 'Highlight')}
            <button
                type="button"
                className={buttonClass(false)}
                onClick={() => {
                    const url = window.prompt('Enter image URL');
                    if (url) {
                        editor.chain().focus().setImage({ src: url }).run();
                    }
                }}
                title="Image"
            >
                <MdImage className="h-4 w-4" />
            </button>
            <button
                type="button"
                className={buttonClass(false)}
                onClick={() => {
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                }}
                title="Table"
            >
                <MdTableChart className="h-4 w-4" />
            </button>
            <button
                type="button"
                className={buttonClass(false)}
                onClick={() => {
                    const href = window.prompt('Enter URL');
                    if (href) {
                        editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
                    }
                }}
                title="Link"
            >
                <MdLink className="h-4 w-4" />
            </button>
            <div className="relative">
                <button
                    type="button"
                    className={buttonClass(false)}
                    onClick={() => setCopilotOpen((value) => !value)}
                    title="AI Co-Pilot"
                    disabled={coPilotLoading}
                >
                    <MdSummarize className="h-4 w-4" />
                </button>
                {copilotOpen ? (
                    <div className="absolute z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                        {aiOptions.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                className="flex w-full items-start rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                    onCoPilotAction(option.key);
                                    setCopilotOpen(false);
                                }}
                            >
                                <span className="font-medium">{option.label}</span>
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
            <button
                type="button"
                onClick={onSave}
                className="ml-auto bg-slate-900 hover:bg-slate-800 text-white font-semibold p-2 rounded-lg shadow-sm flex items-center justify-center"
                title="Save to Database"
            >
                <MdSave className="h-4 w-4" />
            </button>
        </div>
    );
}

function CollaborativeEditor({ documentId }) {
    const ydoc = useMemo(() => new Y.Doc(), []);
    const [docId, setDocId] = useState(null);
    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentUser] = useState({
        name: 'User ' + Math.floor(Math.random() * 100),
        color: getRandomColor(),
    });
    const [aiResult, setAiResult] = useState(null);
    const [coPilotLoading, setCoPilotLoading] = useState(false);
    const [copilotOpen, setCopilotOpen] = useState(false);

    const extensions = useMemo(() => {
        const baseExtensions = [
            StarterKit.configure({ history: false }),
            Placeholder.configure({ placeholder: 'Start writing your research note...' }),
            Collaboration.configure({ document: ydoc }),
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
        ];

        if (provider) {
            return [
                ...baseExtensions.slice(0, 3),
                CollaborationCursor.configure({ provider, user: currentUser }),
                ...baseExtensions.slice(3),
            ];
        }

        return baseExtensions;
    }, [ydoc, provider, currentUser]);

    const editor = useEditor({
        extensions,
        content: '<p>Loading editor...</p>',
        editable: true,
        onUpdate: ({ editor }) => {
            const json = editor.getJSON();
            try {
                window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(json));
            } catch (e) {
                console.warn('Unable to save draft locally', e);
            }
        },
    });

    useEffect(() => {
        if (!editor) {
            return;
        }

        editor.setEditable(true);
    }, [editor]);

    useEffect(() => {
        let providerInstance = null;

        async function initialize() {
            let draft = null;

            if (typeof window !== 'undefined') {
                try {
                    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
                    draft = savedDraft ? JSON.parse(savedDraft) : null;
                } catch (e) {
                    console.warn('Unable to parse saved draft', e);
                }
            }

            const { data, error } = await supabase
                .from('documents')
                .select('id, content_json')
                .eq('id', documentId)
                .single();

            if (error || !data) {
                console.error('Failed to load document:', error);
                setErrorMessage('Failed to load document.');
                setLoading(false);
                return;
            }

            setDocId(data.id);

            providerInstance = new WebsocketProvider(
                'wss://demos.yjs.dev',
                `mooreresearch-collab-room-${data.id}`,
                ydoc
            );
            setProvider(providerInstance);

            if (editor) {
                const dbContent = parseContentJson(data.content_json) || '<p>Start typing...</p>';
                editor.commands.setContent(dbContent);

                if (draft && JSON.stringify(draft) !== JSON.stringify(dbContent)) {
                    console.info('Local draft differs from database content; keeping database content on load.');
                }
            }

            setLoading(false);
        }

        initialize();

        return () => {
            providerInstance?.destroy();
        };
    }, [editor, ydoc]);

    useEffect(() => {
        return () => {
            ydoc.destroy();
        };
    }, [ydoc]);

    const handleSave = async () => {
        if (!editor) {
            alert('Editor is not ready yet. Please wait a moment.');
            return;
        }

        const saveId = docId || documentId;
        const json = editor.getJSON();
        const payload = {
            content_json: json,
            updated_at: new Date().toISOString(),
        };

        let result = await supabase
            .from('documents')
            .update(payload)
            .eq('id', saveId)
            .select('id, content_json')
            .single();

        if (result.error) {
            console.warn('Update failed, trying insert fallback', result.error);
            result = await supabase.from('documents').insert({
                id: saveId,
                ...payload,
            });
        }

        if (result.error) {
            console.error('Save failed', result.error);
            alert('Error saving document: ' + result.error.message);
            return;
        }

        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        }

        if (!docId) {
            setDocId(saveId);
        }

        alert('Document saved successfully!');
    };

    const handleCoPilotAction = async (action) => {
        if (!editor) return;
        setCoPilotLoading(true);
        setAiResult(null);
        setErrorMessage('');

        try {
            const selection = editor.state.selection;
            const selectionText = editor.state.doc.textBetween(selection.from, selection.to);
            const selectedNode = selection.node ? selection.node.toJSON() : null;
            const selectedNodeType = selection.node?.type?.name || null;

            const resp = await fetch('/co-pilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    content: editor.getJSON(),
                    selectionText,
                    selectedNodeType,
                    selectedNode,
                }),
            });
            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(txt || 'AI Co-Pilot request failed');
            }
            const data = await resp.json();
            const resultText = data.result || data.summary || 'No response returned';
            setAiResult({ action, text: resultText });

            if (action === 'improve' || action === 'tone') {
                if (selectionText && selection.from !== selection.to) {
                    editor.chain().focus().deleteSelection().insertContent(resultText).run();
                } else {
                    editor.chain().focus().insertContent(resultText).run();
                }
            } else if (action === 'table-commentary') {
                editor.chain().focus().insertContent(`\n\n${resultText}`).run();
            }
        } catch (err) {
            console.error('AI Co-Pilot error', err);
            setErrorMessage(err.message || 'AI Co-Pilot request failed');
        } finally {
            setCoPilotLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg relative">
            {errorMessage ? (
                <div className="p-6 text-red-700">{errorMessage}</div>
            ) : editor ? (
                <div className="p-4">
                    <MenuBar
                        editor={editor}
                        onSave={handleSave}
                        onCoPilotAction={handleCoPilotAction}
                        copilotOpen={copilotOpen}
                        setCopilotOpen={setCopilotOpen}
                        coPilotLoading={coPilotLoading}
                    />
                    {coPilotLoading ? (
                        <div className="mb-3 text-sm text-slate-600">Generating AI response…</div>
                    ) : null}
                    {aiResult ? (
                        <div className="mt-3 p-3 bg-gray-50 border rounded">
                            <div className="font-semibold mb-2">
                                {aiResult.action === 'summarize'
                                    ? 'AI Summary'
                                    : aiResult.action === 'improve'
                                        ? 'Improved Writing'
                                        : aiResult.action === 'tone'
                                            ? 'Formal Tone Rewrite'
                                            : 'Table/Chart Commentary'}
                            </div>
                            <div className="whitespace-pre-line text-sm">{aiResult.text}</div>
                        </div>
                    ) : null}
                    <div className="p-5 min-h-[300px] bg-white rounded">
                        <EditorContent editor={editor} />
                    </div>
                </div>
            ) : (
                <div className="p-6">Loading editor...</div>
            )}
        </div>
    );
}

export default function Page({ params }) {
    return <CollaborativeEditor documentId={params?.documentId} />;
}