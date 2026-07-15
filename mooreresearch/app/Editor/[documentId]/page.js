"use client";

import { useEffect, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
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
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
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
    MdUndo,
    MdRedo,
    MdContentCopy,
    MdContentPaste,
} from 'react-icons/md';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const colors = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];
const DRAFT_STORAGE_KEY = 'mooreresearch-doc-draft';
const FONT_OPTIONS = ['Arial', 'Calibri', 'Cambria', 'Georgia', 'Garamond', 'Times New Roman', 'Verdana'];
const FONT_SIZE_OPTIONS = ['4', '6', '8', '10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '40', '48', '56', '64', '72'];

function normalizeFontFamily(fontFamily) {
    if (!fontFamily) {
        return '';
    }

    const cleaned = String(fontFamily)
        .split(',')[0]
        .trim()
        .replace(/^['"]|['"]$/g, '');

    const matchedOption = FONT_OPTIONS.find((option) => option.toLowerCase() === cleaned.toLowerCase());
    return matchedOption || cleaned;
}

function normalizeFontSize(sizeValue) {
    const value = (sizeValue || '').trim();

    if (!value) {
        return null;
    }

    if (/^\d+(\.\d+)?$/.test(value)) {
        return `${value}pt`;
    }

    if (/^\d+(\.\d+)?(px|pt|em|rem|%)$/i.test(value)) {
        return value;
    }

    return null;
}

function toSizeInputValue(fontSize) {
    if (!fontSize) {
        return '';
    }

    const match = String(fontSize).trim().match(/^(\d+(?:\.\d+)?)(px|pt|em|rem|%)?$/i);
    return match ? match[1] : String(fontSize);
}
//const DOCUMENT_ID_TO_LOAD = 'c63d1b04-aadf-4251-871a-bc5a7da82fe8';

const FontFamily = Extension.create({
    name: 'fontFamily',

    addGlobalAttributes() {
        return [
            {
                types: ['textStyle'],
                attributes: {
                    fontFamily: {
                        default: null,
                        parseHTML: (element) => element.style.fontFamily || null,
                        renderHTML: (attributes) => {
                            if (!attributes.fontFamily) {
                                return {};
                            }

                            return {
                                style: `font-family: ${attributes.fontFamily}`,
                            };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setFontFamily:
                (fontFamily) =>
                ({ chain }) =>
                    chain().setMark('textStyle', { fontFamily }).run(),
            unsetFontFamily:
                () =>
                ({ chain }) =>
                    chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run(),
        };
    },
});

const FontSize = Extension.create({
    name: 'fontSize',

    addGlobalAttributes() {
        return [
            {
                types: ['textStyle'],
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize || null,
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) {
                                return {};
                            }

                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setFontSize:
                (fontSize) =>
                ({ chain }) =>
                    chain().setMark('textStyle', { fontSize }).run(),
            unsetFontSize:
                () =>
                ({ chain }) =>
                    chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});

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

    const ribbonButtonClass = (active) =>
        `inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs font-medium transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`;

    const btn = (onClick, active, label, Icon) => (
        <button type="button" onClick={onClick} className={buttonClass(active)} title={label}>
            {Icon ? <Icon className="h-4 w-4" /> : null}
        </button>
    );

    const ribbonBtn = (onClick, active, label, content) => (
        <button type="button" onClick={onClick} className={ribbonButtonClass(active)} title={label}>
            {content}
        </button>
    );

    const RibbonGroup = ({ title, children, className = '' }) => (
        <div className={`min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${className}`}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
            <div className="flex flex-wrap items-center gap-1.5">{children}</div>
        </div>
    );

    const selectedFontFamily = normalizeFontFamily(editor.getAttributes('textStyle').fontFamily);
    const selectedFontSize = editor.getAttributes('textStyle').fontSize || '';
    const selectedTextColor = editor.getAttributes('textStyle').color || '#111827';

    const handleCopy = async () => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, '\n');
        const textToCopy = selectedText || editor.getText();

        if (!textToCopy) {
            return;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
        } catch (error) {
            console.warn('Clipboard copy failed', error);
            window.alert('Copy failed. Please use Ctrl+C.');
        }
    };

    const handleCut = async () => {
        const { from, to } = editor.state.selection;
        if (from === to) {
            return;
        }

        const selectedText = editor.state.doc.textBetween(from, to, '\n');

        try {
            await navigator.clipboard.writeText(selectedText);
            editor.chain().focus().deleteSelection().run();
        } catch (error) {
            console.warn('Clipboard cut failed', error);
            window.alert('Cut failed. Please use Ctrl+X.');
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                editor.chain().focus().insertContent(text).run();
            }
        } catch (error) {
            console.warn('Clipboard paste failed', error);
            window.alert('Paste failed. Please use Ctrl+V.');
        }
    };

    const handleClearFormatting = () => {
        editor.chain().focus().unsetAllMarks().clearNodes().run();
    };

    const applyFontSize = (rawValue) => {
        const normalizedSize = normalizeFontSize(rawValue);

        if (normalizedSize) {
            editor.chain().focus().setFontSize(normalizedSize).run();
            return;
        }

        if (!rawValue.trim()) {
            editor.chain().focus().unsetFontSize().run();
        }
    };

    const aiOptions = [
        { key: 'summarize', label: 'Summarize' },
        { key: 'improve', label: 'Improve Writing' },
        { key: 'tone', label: 'Change Tone' },
        { key: 'table-commentary', label: 'Generate Table/Chart Commentary' },
    ];

    return (
        <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                <div className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white">Home</div>
                <div className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-500">Insert</div>
                <div className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-500">Review</div>
            </div>

            <div className="flex flex-wrap items-stretch gap-3">
                <RibbonGroup title="Clipboard">
                    {ribbonBtn(() => handleCut(), false, 'Cut', <span>Cut</span>)}
                    {ribbonBtn(() => handleCopy(), false, 'Copy', <span>Copy</span>)}
                    {ribbonBtn(() => handlePaste(), false, 'Paste', <span>Paste</span>)}
                    {ribbonBtn(() => editor.chain().focus().undo().run(), false, 'Undo', <span>Undo</span>)}
                    {ribbonBtn(() => editor.chain().focus().redo().run(), false, 'Redo', <span>Redo</span>)}
                </RibbonGroup>

                <RibbonGroup title="Font" className="flex-1 min-w-[320px]">
                    <input
                        key={selectedFontFamily || 'font-family-empty'}
                        list="font-family-options"
                        className="h-9 w-36 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                        defaultValue={selectedFontFamily}
                        placeholder="Font"
                        title="Font Family"
                        onBlur={(event) => {
                            const fontFamily = normalizeFontFamily(event.target.value);
                            if (fontFamily) {
                                editor.chain().focus().setFontFamily(fontFamily).run();
                            } else {
                                editor.chain().focus().unsetFontFamily().run();
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                const fontFamily = normalizeFontFamily(event.currentTarget.value);
                                if (fontFamily) {
                                    editor.chain().focus().setFontFamily(fontFamily).run();
                                } else {
                                    editor.chain().focus().unsetFontFamily().run();
                                }
                                event.currentTarget.blur();
                            }
                        }}
                    />
                    <datalist id="font-family-options">
                        {FONT_OPTIONS.map((font) => (
                            <option key={font} value={font} />
                        ))}
                    </datalist>

                    <input
                        key={selectedFontSize || 'font-size-empty'}
                        list="font-size-options"
                        className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                        defaultValue={toSizeInputValue(selectedFontSize)}
                        placeholder="Size"
                        title="Font Size (type a number for pt, or include units like px/pt)"
                        onBlur={(event) => applyFontSize(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                applyFontSize(event.currentTarget.value);
                                event.currentTarget.blur();
                            }
                        }}
                    />
                    <datalist id="font-size-options">
                        {FONT_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size} />
                        ))}
                    </datalist>

                    <input
                        type="color"
                        className="h-9 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                        value={selectedTextColor}
                        title="Text Color"
                        onChange={(event) => {
                            const color = event.target.value;
                            editor.chain().focus().setColor(color).run();
                        }}
                    />

                    {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold', MdFormatBold)}
                    {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic', MdFormatItalic)}
                    {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline', MdFormatUnderlined)}
                    {btn(() => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Strike', MdFormatStrikethrough)}
                    {ribbonBtn(() => editor.chain().focus().toggleSubscript().run(), editor.isActive('subscript'), 'Subscript', <span className="text-sm">x₂</span>)}
                    {ribbonBtn(() => editor.chain().focus().toggleSuperscript().run(), editor.isActive('superscript'), 'Superscript', <span className="text-sm">x²</span>)}
                    {ribbonBtn(() => editor.chain().focus().toggleHighlight({ color: '#FCEF6D' }).run(), editor.isActive('highlight'), 'Highlight', <span>Highlighter</span>)}
                    {ribbonBtn(() => handleClearFormatting(), false, 'Clear formatting', <span>Clear</span>)}
                </RibbonGroup>

                <RibbonGroup title="Paragraph">
                    {ribbonBtn(() => editor.chain().focus().setParagraph().run(), editor.isActive('paragraph'), 'Paragraph', <span>Normal</span>)}
                    {ribbonBtn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), 'H1', <span>H1</span>)}
                    {ribbonBtn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'H2', <span>H2</span>)}
                    {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet', MdFormatListBulleted)}
                    {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered', MdFormatListNumbered)}
                    {ribbonBtn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Quote', <span>Quote</span>)}
                    {btn(() => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), 'Left', MdFormatAlignLeft)}
                    {btn(() => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), 'Center', MdFormatAlignCenter)}
                    {btn(() => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), 'Right', MdFormatAlignRight)}
                    {ribbonBtn(() => editor.chain().focus().setTextAlign('justify').run(), editor.isActive({ textAlign: 'justify' }), 'Justify', <span>Justify</span>)}
                </RibbonGroup>

                <RibbonGroup title="Insert">
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
                </RibbonGroup>

                <RibbonGroup title="Review">
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
                            <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
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
                </RibbonGroup>

                <div className="ml-auto flex items-start">
                    <button
                        type="button"
                        onClick={onSave}
                        className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        title="Save to Database"
                    >
                        <MdSave className="mr-2 h-4 w-4" />
                        Save
                    </button>
                </div>
            </div>
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
            FontFamily,
            FontSize,
            Subscript,
            Superscript,
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
            is_active_draft: true,
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