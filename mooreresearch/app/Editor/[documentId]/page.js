"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
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
import ReactCrop from 'react-image-crop';
import { createPortal } from 'react-dom';
import * as Y from 'yjs';
import { createClient as createLiveblocksClient } from '@liveblocks/client';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
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
const LAST_TEXT_COLOR_STORAGE_KEY = 'mooreresearch-last-text-color';
const FONT_OPTIONS = ['Arial', 'Calibri', 'Cambria', 'Georgia', 'Garamond', 'Times New Roman', 'Verdana'];
const FONT_SIZE_OPTIONS = ['4', '6', '8', '10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '40', '48', '56', '64', '72'];
const DEFAULT_TEXT_COLORS = ['#111827', '#374151', '#6B7280', '#B91C1C', '#D97706', '#CA8A04', '#15803D', '#0F766E', '#1D4ED8', '#7C3AED', '#DB2777'];
const THEME_TEXT_PALETTE = [
    { label: 'Dark 1', colors: ['#000000', '#1F2937', '#374151', '#4B5563', '#6B7280'] },
    { label: 'Light 1', colors: ['#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1'] },
    { label: 'Blue', colors: ['#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'] },
    { label: 'Green', colors: ['#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC'] },
    { label: 'Yellow', colors: ['#A16207', '#CA8A04', '#EAB308', '#FACC15', '#FDE047'] },
    { label: 'Orange', colors: ['#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74'] },
    { label: 'Red', colors: ['#B91C1C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5'] },
    { label: 'Purple', colors: ['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD'] },
];
const liveblocksClient = createLiveblocksClient({
    authEndpoint: '/api/liveblocks-auth',
});

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

function drawCroppedImage(image, canvas, crop) {
    if (!image || !canvas || !crop) {
        return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;
    const outputWidth = Math.max(1, Math.floor(crop.width * pixelRatio));
    const outputHeight = Math.max(1, Math.floor(crop.height * pixelRatio));

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
    );
}

function percentCropToPixelCrop(image, crop) {
    if (!image || !crop) {
        return null;
    }

    return {
        unit: 'px',
        x: (crop.x / 100) * image.width,
        y: (crop.y / 100) * image.height,
        width: (crop.width / 100) * image.width,
        height: (crop.height / 100) * image.height,
    };
}

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

const StyledImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-width') || element.style.width || null,
                renderHTML: (attributes) => {
                    if (!attributes.width) {
                        return {};
                    }

                    return {
                        'data-width': attributes.width,
                        style: `width: ${attributes.width}; max-width: 100%; height: auto;`,
                    };
                },
            },
            crop: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-crop') || null,
                renderHTML: (attributes) => {
                    if (!attributes.crop) {
                        return {};
                    }

                    const cropStyles = {
                        square: 'height: 360px; object-fit: cover; object-position: center center; overflow: hidden;',
                        widescreen: 'height: 225px; object-fit: cover; object-position: center center; overflow: hidden;',
                        portrait: 'height: 480px; object-fit: cover; object-position: center center; overflow: hidden;',
                    };

                    return {
                        'data-crop': attributes.crop,
                        style: cropStyles[attributes.crop] || 'height: 360px; object-fit: cover; object-position: center center; overflow: hidden;',
                    };
                },
            },
            alignment: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-alignment') || null,
                renderHTML: (attributes) => {
                    if (!attributes.alignment) {
                        return {};
                    }

                    if (attributes.alignment === 'center') {
                        return {
                            'data-alignment': 'center',
                            style: 'display: block; margin-left: auto; margin-right: auto;',
                        };
                    }

                    if (attributes.alignment === 'right') {
                        return {
                            'data-alignment': 'right',
                            style: 'display: block; margin-left: auto; margin-right: 0;',
                        };
                    }

                    return {
                        'data-alignment': 'left',
                        style: 'display: block; margin-left: 0; margin-right: auto;',
                    };
                },
            },
            wrap: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-wrap') || null,
                renderHTML: (attributes) => {
                    if (!attributes.wrap) {
                        return {};
                    }

                    if (attributes.wrap === 'left') {
                        return {
                            'data-wrap': 'left',
                            style: 'float: left; margin: 0.25rem 1rem 0.75rem 0;',
                        };
                    }

                    if (attributes.wrap === 'right') {
                        return {
                            'data-wrap': 'right',
                            style: 'float: right; margin: 0.25rem 0 0.75rem 1rem;',
                        };
                    }

                    return {
                        'data-wrap': 'none',
                        style: 'float: none; clear: both; margin: 0.75rem auto;',
                    };
                },
            },
        };
    },
});

function ImageCropDialog({ open, src, onClose, onSave }) {
    const imageRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!open || !src) {
            setCrop(undefined);
            setCompletedCrop(null);
            setSaving(false);
            setErrorMessage('');
            return;
        }

        setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
        setCompletedCrop(null);
        setSaving(false);
        setErrorMessage('');
    }, [open, src]);

    useEffect(() => {
        if (!completedCrop || !imageRef.current || !previewCanvasRef.current) {
            return;
        }

        try {
            drawCroppedImage(imageRef.current, previewCanvasRef.current, completedCrop);
        } catch (error) {
            console.warn('Unable to update crop preview', error);
        }
    }, [completedCrop]);

    if (!open || !src) {
        return null;
    }

    const handleSave = async () => {
        if (!imageRef.current || !previewCanvasRef.current || !completedCrop) {
            setErrorMessage('Please select a crop area first.');
            return;
        }

        try {
            setSaving(true);
            drawCroppedImage(imageRef.current, previewCanvasRef.current, completedCrop);
            const croppedDataUrl = previewCanvasRef.current.toDataURL('image/png');
            onSave(croppedDataUrl);
            onClose();
        } catch (error) {
            console.error('Image crop failed', error);
            setErrorMessage('Cropping failed. The source image may block canvas export.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <div className="text-base font-semibold text-slate-900">Crop Picture</div>
                        <div className="text-sm text-slate-500">Drag the handles to choose the crop area.</div>
                    </div>
                    <button type="button" className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" onClick={onClose}>
                        Close
                    </button>
                </div>
                <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)} keepSelection>
                            <img
                                ref={imageRef}
                                src={src}
                                alt="Crop source"
                                crossOrigin="anonymous"
                                className="max-h-[70vh] w-auto max-w-full"
                                onLoad={() => {
                                    const nextCrop = { unit: '%', x: 10, y: 10, width: 80, height: 80 };
                                    setCrop(nextCrop);

                                    if (imageRef.current && previewCanvasRef.current) {
                                        const pixelCrop = percentCropToPixelCrop(imageRef.current, nextCrop);
                                        if (pixelCrop) {
                                            setCompletedCrop(pixelCrop);
                                        }
                                    }
                                }}
                            />
                        </ReactCrop>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 text-sm font-semibold text-slate-900">Preview</div>
                            <canvas ref={previewCanvasRef} className="h-auto w-full rounded-lg border border-slate-200 bg-white" />
                        </div>
                        {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div> : null}
                        <div className="mt-auto flex gap-2">
                            <button type="button" className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="button" className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Apply Crop'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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

function replaceTextNodes(node, findValue, replaceValue) {
    if (Array.isArray(node)) {
        return node.map((child) => replaceTextNodes(child, findValue, replaceValue));
    }

    if (!node || typeof node !== 'object') {
        return node;
    }

    const nextNode = { ...node };

    if (typeof nextNode.text === 'string') {
        const escapedFind = findValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        nextNode.text = nextNode.text.replace(new RegExp(escapedFind, 'gi'), replaceValue);
    }

    if (Array.isArray(nextNode.content)) {
        nextNode.content = nextNode.content.map((child) => replaceTextNodes(child, findValue, replaceValue));
    }

    return nextNode;
}

function MenuBar({ editor, onSave, onCoPilotAction, copilotOpen, setCopilotOpen, coPilotLoading, currentUser }) {
    const [fileMenuOpen, setFileMenuOpen] = useState(false);
    const [fileAdvancedOpen, setFileAdvancedOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [commentText, setCommentText] = useState('');
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [cropSource, setCropSource] = useState('');
    const [pictureAdvancedOpen, setPictureAdvancedOpen] = useState(false);
    const [reviewAdvancedOpen, setReviewAdvancedOpen] = useState(false);
    const imageUploadRef = useRef(null);
    const fileButtonRef = useRef(null);
    const textColorButtonRef = useRef(null);
    const copilotButtonRef = useRef(null);
    const [fileMenuPosition, setFileMenuPosition] = useState({ top: 0, left: 0 });
    const [textColorMenuPosition, setTextColorMenuPosition] = useState({ top: 0, left: 0 });
    const [copilotMenuPosition, setCopilotMenuPosition] = useState({ top: 0, left: 0 });
    const textColorMenuRef = useRef(null);
    const [lastTextColor, setLastTextColor] = useState(() => {
        if (typeof window === 'undefined') {
            return '#111827';
        }

        return window.localStorage.getItem(LAST_TEXT_COLOR_STORAGE_KEY) || '#111827';
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(LAST_TEXT_COLOR_STORAGE_KEY, lastTextColor);
    }, [lastTextColor]);

    const [textColorMenuOpen, setTextColorMenuOpen] = useState(false);
    const [customColorOpen, setCustomColorOpen] = useState(false);
    const [customColorValue, setCustomColorValue] = useState('#1D4ED8');

    const imageIsActive = editor.isActive('image');
    useEffect(() => {
        if (!imageIsActive) {
            setPictureAdvancedOpen(false);
        }
    }, [imageIsActive]);

    useEffect(() => {
        if (!fileMenuOpen) {
            setFileAdvancedOpen(false);
        }
    }, [fileMenuOpen]);

    useEffect(() => {
        if (activeTab !== 'review') {
            setReviewAdvancedOpen(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!textColorMenuOpen) {
            setCustomColorOpen(false);
        };
    }, [textColorMenuOpen]);

    if (!editor) return null;

    const buttonClass = (active) =>
        `inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs font-medium transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`;

    const ribbonButtonClass = (active) =>
        `inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs font-medium transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`;

    const ribbonBtn = (onClick, active, label, content) => (
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={ribbonButtonClass(active)} title={label}>
            {content}
        </button>
    );

    const ribbonIconButton = (onClick, active, label, Icon, text) => (
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={ribbonButtonClass(active)} title={label}>
            <span className="inline-flex items-center gap-1.5">
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                <span>{text}</span>
            </span>
        </button>
    );

    const RibbonGroup = ({ title, children, className = '' }) => (
        <div className={`min-w-0 shrink rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${className}`}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
            <div className="flex flex-wrap items-center gap-1.5">{children}</div>
        </div>
    );

    const selectedFontFamily = normalizeFontFamily(editor.getAttributes('textStyle').fontFamily);
    const selectedFontSize = editor.getAttributes('textStyle').fontSize || '';
    const selectedTextColor = editor.getAttributes('textStyle').color || lastTextColor;
    const imageAttrs = editor.getAttributes('image') || {};
    const tableIsActive = editor.isActive('table');
    const tableCellIsActive = editor.isActive('tableCell') || editor.isActive('tableHeader');
    const tableHeaderIsActive = editor.isActive('tableHeader');
    const tableBodyCellIsActive = editor.isActive('tableCell');

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

    const handleInsertPageBreak = () => {
        if (editor.can().setHorizontalRule()) {
            editor.chain().focus().setHorizontalRule().run();
            return;
        }

        editor.chain().focus().insertContent('<hr />').run();
    };

    const handleInsertImageUrl = () => {
        const url = window.prompt('Enter image URL');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const src = typeof reader.result === 'string' ? reader.result : '';
            if (src) {
                editor.chain().focus().setImage({ src }).run();
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleReplaceImageUrl = () => {
        const url = window.prompt('Enter replacement image URL');
        if (url) {
            editor.chain().focus().updateAttributes('image', { src: url }).run();
        }
    };

    const handleDeleteImage = () => {
        editor.chain().focus().deleteNode('image').run();
    };

    const handleOpenCropDialog = () => {
        const src = imageAttrs.src;
        if (!src) {
            return;
        }

        setCropSource(src);
        setCropDialogOpen(true);
    };

    const handleApplyCroppedImage = (croppedSrc) => {
        editor.chain().focus().updateAttributes('image', { src: croppedSrc, crop: null }).run();
    };

    const setImageAlignment = (alignment) => {
        editor.chain().focus().updateAttributes('image', { alignment, wrap: null }).run();
    };

    const setImageWrap = (wrap) => {
        editor.chain().focus().updateAttributes('image', { wrap, alignment: null }).run();
    };

    const clearImageLayout = () => {
        editor.chain().focus().updateAttributes('image', { alignment: null, wrap: null }).run();
    };

    const setImageWidth = (width) => {
        editor.chain().focus().updateAttributes('image', { width }).run();
    };

    const setImageCrop = (crop) => {
        editor.chain().focus().updateAttributes('image', { crop, wrap: null, alignment: null }).run();
    };

    const handleCustomImageWidth = () => {
        const width = window.prompt('Enter image width (for example 320px or 60%)');
        if (width && width.trim()) {
            setImageWidth(width.trim());
        }
    };

    const clearImageWidth = () => {
        editor.chain().focus().updateAttributes('image', { width: null }).run();
    };

    const clearImageCrop = () => {
        editor.chain().focus().updateAttributes('image', { crop: null }).run();
    };

    const insertTable = (rows, cols) => {
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    };

    const tableAction = (commandName) => {
        const chain = editor.chain().focus();

        if (typeof chain[commandName] === 'function') {
            chain[commandName]().run();
        }
    };

    const handleInsertComment = () => {
        const note = commentText.trim() || window.prompt('Enter comment')?.trim() || '';
        if (!note) {
            return;
        }

        const timestamp = new Date().toLocaleString();
        const authorName = currentUser?.name || 'Reviewer';

        const commentBlock = {
            type: 'blockquote',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: 'Comment',
                            marks: [{ type: 'bold' }],
                        },
                        { type: 'text', text: ` · ${timestamp}` },
                    ],
                },
                {
                    type: 'paragraph',
                    content: [
                        { type: 'text', text: note },
                    ],
                },
                {
                    type: 'paragraph',
                    content: [
                        { type: 'text', text: `${authorName} · ${timestamp}` },
                    ],
                },
            ],
        };

        editor.chain().focus().insertContent([commentBlock, { type: 'paragraph' }]).run();
        setCommentText('');
    };

    const handleFindReplace = () => {
        const findValue = window.prompt('Find what?');
        if (!findValue) {
            return;
        }

        const replaceValue = window.prompt('Replace with? Leave blank to just find');
        const docText = editor.getText();

        if (replaceValue === null) {
            return;
        }

        if (replaceValue === '') {
            const firstIndex = docText.toLowerCase().indexOf(findValue.toLowerCase());
            if (firstIndex >= 0) {
                alert(`Found "${findValue}" at character ${firstIndex + 1}.`);
            } else {
                alert(`No match for "${findValue}".`);
            }
            return;
        }

        const currentDoc = editor.getJSON();
        const updatedDoc = replaceTextNodes(currentDoc, findValue, replaceValue);

        if (JSON.stringify(updatedDoc) === JSON.stringify(currentDoc)) {
            alert(`No match for "${findValue}".`);
            return;
        }

        editor.commands.setContent(updatedDoc);
        alert(`Replaced occurrences of "${findValue}".`);
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
        <div className="sticky top-0 z-30 mb-4 overflow-visible rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-100/95 via-slate-100/90 to-slate-50/95 p-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-slate-100/85">
            <div className="-mx-2.5 -mt-2.5 mb-2 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/60 bg-white/60 px-2.5 pb-1.5 pt-2 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                    <div className="relative">
                        <button
                            ref={fileButtonRef}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event) => {
                                const nextOpen = !fileMenuOpen;
                                if (nextOpen) {
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    const panelWidth = 384;
                                    setFileMenuPosition({
                                        top: Math.min(rect.bottom + 8, window.innerHeight - 24),
                                        left: Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12)),
                                    });
                                }
                                setFileMenuOpen(nextOpen);
                            }}
                            className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                        >
                            File
                        </button>
                        {fileMenuOpen ? (
                            <div className="fixed inset-0 z-50" onMouseDown={() => setFileMenuOpen(false)}>
                                <div
                                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                                    style={{ position: 'fixed', top: `${fileMenuPosition.top}px`, left: `${fileMenuPosition.left}px`, width: '24rem', maxHeight: 'calc(100vh - 24px)' }}
                                    onMouseDown={(event) => event.stopPropagation()}
                                >
                                    <div className="grid grid-cols-[9rem_1fr]">
                                        <div className="border-r border-slate-200 bg-slate-50 p-3">
                                            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Backstage</div>
                                            <button type="button" className="mb-2 w-full rounded-2xl bg-slate-900 px-3 py-2 text-left text-sm font-semibold text-white" onClick={() => { onSave(); setFileMenuOpen(false); }}>
                                                Save
                                            </button>
                                            <button type="button" className={buttonClass(fileAdvancedOpen)} onMouseDown={(event) => event.preventDefault()} onClick={() => setFileAdvancedOpen((value) => !value)}>
                                                <span className="text-xs font-medium">More</span>
                                            </button>
                                        </div>
                                        <div className="p-4">
                                            <div className="text-sm font-semibold text-slate-900">Document actions</div>
                                            <p className="mt-1 text-sm text-slate-600">Save stays visible. Clipboard and cleanup actions are tucked under More.</p>
                                            {fileAdvancedOpen ? (
                                                <div className="mt-4 space-y-2">
                                                    <button type="button" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700" onClick={() => { handleCopy(); setFileMenuOpen(false); }}>
                                                        Copy selected text
                                                    </button>
                                                    <button type="button" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700" onClick={() => { handlePaste(); setFileMenuOpen(false); }}>
                                                        Paste from clipboard
                                                    </button>
                                                    <button type="button" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700" onClick={() => { handleClearFormatting(); setFileMenuOpen(false); }}>
                                                        Clear formatting
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                                    Open More for clipboard and formatting tools.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setActiveTab('home')}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${activeTab === 'home' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                    >
                        Home
                    </button>
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setActiveTab('insert')}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${activeTab === 'insert' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                    >
                        Insert
                    </button>
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setActiveTab('review')}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${activeTab === 'review' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                    >
                        Review
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    {ribbonBtn(() => editor.chain().focus().undo().run(), false, 'Undo', <span>Undo</span>)}
                    {ribbonBtn(() => editor.chain().focus().redo().run(), false, 'Redo', <span>Redo</span>)}
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={onSave}
                        className="ml-1.5 inline-flex h-9 items-center justify-center rounded-2xl bg-slate-900 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        title="Save to Database"
                    >
                        <MdSave className="mr-2 h-4 w-4" />
                        Save
                    </button>
                </div>
            </div>

            <div className="flex items-stretch gap-2.5 overflow-x-auto px-0.5 pb-1">
                {activeTab === 'home' ? (
                    <>
                        <RibbonGroup title="Clipboard">
                            {ribbonIconButton(() => handleCut(), false, 'Cut', MdContentCopy, 'Cut')}
                            {ribbonIconButton(() => handleCopy(), false, 'Copy', MdContentCopy, 'Copy')}
                            {ribbonIconButton(() => handlePaste(), false, 'Paste', MdContentPaste, 'Paste')}
                            {ribbonIconButton(() => editor.chain().focus().undo().run(), false, 'Undo', MdUndo, 'Undo')}
                            {ribbonIconButton(() => editor.chain().focus().redo().run(), false, 'Redo', MdRedo, 'Redo')}
                        </RibbonGroup>

                        <div className="hidden self-stretch border-l border-slate-200/70 sm:block" aria-hidden="true" />

                        <RibbonGroup title="Font" className="flex-1 min-w-[340px]">
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

                            <div className="relative">
                                <button
                                    ref={textColorButtonRef}
                                    type="button"
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={(event) => {
                                        const nextOpen = !textColorMenuOpen;
                                        if (nextOpen) {
                                            const rect = event.currentTarget.getBoundingClientRect();
                                            const panelWidth = Math.min(248, window.innerWidth - 24);
                                            setTextColorMenuPosition({
                                                top: Math.min(rect.bottom + 8, window.innerHeight - 24),
                                                left: Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12)),
                                            });
                                        }
                                        setTextColorMenuOpen(nextOpen);
                                    }}
                                    title="Text Color"
                                >
                                    <span className="h-4 w-4 rounded border border-slate-300" style={{ backgroundColor: selectedTextColor }} />
                                    <span>Color</span>
                                </button>
                                {textColorMenuOpen ? createPortal(
                                    <div className="fixed inset-0 z-[120]" onMouseDown={() => setTextColorMenuOpen(false)}>
                                        <div
                                            className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl"
                                            style={{
                                                position: 'fixed',
                                                top: `${textColorMenuPosition.top}px`,
                                                left: `${textColorMenuPosition.left}px`,
                                                width: 'min(248px, calc(100vw - 24px))',
                                                maxHeight: 'calc(100vh - 24px)',
                                            }}
                                            onMouseDown={(event) => event.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <button
                                                    type="button"
                                                    className={buttonClass(!editor.getAttributes('textStyle').color)}
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => {
                                                        editor.chain().focus().unsetColor().run();
                                                        setTextColorMenuOpen(false);
                                                    }}
                                                    title="Automatic text color"
                                                >
                                                    <span className="text-xs font-medium">Auto</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={buttonClass(false)}
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => {
                                                        setCustomColorValue(selectedTextColor || lastTextColor || '#1D4ED8');
                                                        setCustomColorOpen((value) => !value);
                                                    }}
                                                    title="More colors"
                                                >
                                                    <span className="text-xs font-medium">More...</span>
                                                </button>
                                            </div>

                                            {customColorOpen ? (
                                                <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                                                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Custom</div>
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        <input
                                                            type="color"
                                                            className="h-8 w-9 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                                                            value={customColorValue}
                                                            onChange={(event) => setCustomColorValue(event.target.value)}
                                                            title="Pick a custom color"
                                                        />
                                                        <input
                                                            type="text"
                                                            className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700"
                                                            value={customColorValue}
                                                            onChange={(event) => setCustomColorValue(event.target.value)}
                                                            placeholder="#1D4ED8"
                                                            title="Enter a hex color"
                                                        />
                                                        <button
                                                            type="button"
                                                            className={buttonClass(false)}
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => {
                                                                const normalizedColor = customColorValue.trim();
                                                                if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalizedColor)) {
                                                                    window.alert('Please enter a valid hex color like #1D4ED8.');
                                                                    return;
                                                                }

                                                                setLastTextColor(normalizedColor);
                                                                editor.chain().focus().setColor(normalizedColor).run();
                                                                setCustomColorOpen(false);
                                                                setTextColorMenuOpen(false);
                                                            }}
                                                        >
                                                            <span className="text-xs font-medium">Apply</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={buttonClass(false)}
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => setCustomColorOpen(false)}
                                                        >
                                                            <span className="text-xs font-medium">Cancel</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="mt-1.5 border-t border-slate-200 pt-1.5">
                                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Theme</div>
                                                <div className="flex flex-col gap-0.5">
                                                    {THEME_TEXT_PALETTE.map((row) => (
                                                        <div key={row.label} className="flex items-center gap-1">
                                                            <span className="w-8 shrink-0 text-[8px] font-medium uppercase tracking-wide text-slate-400">{row.label}</span>
                                                            <div className="flex flex-wrap items-center gap-0.5">
                                                                {row.colors.map((color) => (
                                                                    <button
                                                                        key={`${row.label}-${color}`}
                                                                        type="button"
                                                                        className={`h-5.5 w-5.5 rounded-md border ${selectedTextColor === color ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200'}`}
                                                                        style={{ backgroundColor: color, boxShadow: color === '#FFFFFF' ? 'inset 0 0 0 1px rgba(148, 163, 184, 0.7)' : undefined }}
                                                                        onMouseDown={(event) => event.preventDefault()}
                                                                        onClick={() => {
                                                                            setLastTextColor(color);
                                                                            editor.chain().focus().setColor(color).run();
                                                                            setTextColorMenuOpen(false);
                                                                        }}
                                                                        title={`Use ${color}`}
                                                                        aria-label={`Use ${color}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-1.5 border-t border-slate-200 pt-1.5">
                                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Std</div>
                                                <div className="flex flex-wrap items-center gap-0.5">
                                                    {DEFAULT_TEXT_COLORS.map((color) => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            className={`h-5.5 w-5.5 rounded-md border ${selectedTextColor === color ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200'}`}
                                                            style={{ backgroundColor: color }}
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => {
                                                                setLastTextColor(color);
                                                                editor.chain().focus().setColor(color).run();
                                                                setTextColorMenuOpen(false);
                                                            }}
                                                            title={`Use ${color}`}
                                                            aria-label={`Use ${color}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>,
                                    document.body
                                ) : null}
                            </div>

                            {ribbonIconButton(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold', MdFormatBold, 'Bold')}
                            {ribbonIconButton(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic', MdFormatItalic, 'Italic')}
                            {ribbonIconButton(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline', MdFormatUnderlined, 'Underline')}
                            {ribbonIconButton(() => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Strike', MdFormatStrikethrough, 'Strike')}
                            {ribbonBtn(() => editor.chain().focus().toggleSubscript().run(), editor.isActive('subscript'), 'Subscript', <span className="text-sm">x₂</span>)}
                            {ribbonBtn(() => editor.chain().focus().toggleSuperscript().run(), editor.isActive('superscript'), 'Superscript', <span className="text-sm">x²</span>)}
                            {ribbonBtn(() => editor.chain().focus().toggleHighlight({ color: '#FCEF6D' }).run(), editor.isActive('highlight'), 'Highlight', <span>Highlighter</span>)}
                            {ribbonBtn(() => handleClearFormatting(), false, 'Clear formatting', <span>Clear</span>)}
                        </RibbonGroup>

                        <div className="hidden self-stretch border-l border-slate-200/70 sm:block" aria-hidden="true" />

                        <RibbonGroup title="Paragraph" className="flex-1 min-w-[24rem] max-w-full">
                            {ribbonIconButton(() => editor.chain().focus().setParagraph().run(), editor.isActive('paragraph'), 'Paragraph', null, 'Normal')}
                            {ribbonIconButton(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), 'H1', null, 'H1')}
                            {ribbonIconButton(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'H2', null, 'H2')}
                            {ribbonIconButton(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet', MdFormatListBulleted, 'Bullets')}
                            {ribbonIconButton(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered', MdFormatListNumbered, 'Numbering')}
                            {ribbonBtn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Quote', <span className={editor.isActive('blockquote') ? 'font-semibold' : ''}>Quote</span>)}
                            {ribbonIconButton(() => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), 'Left', MdFormatAlignLeft, 'Left')}
                            {ribbonIconButton(() => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), 'Center', MdFormatAlignCenter, 'Center')}
                            {ribbonIconButton(() => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), 'Right', MdFormatAlignRight, 'Right')}
                            {ribbonBtn(() => editor.chain().focus().setTextAlign('justify').run(), editor.isActive({ textAlign: 'justify' }), 'Justify', <span className={editor.isActive({ textAlign: 'justify' }) ? 'font-semibold' : ''}>Justify</span>)}
                        </RibbonGroup>
                    </>
                ) : null}

                {activeTab === 'insert' ? (
                    <>
                        <RibbonGroup title="Insert">
                            <button
                                type="button"
                                className={buttonClass(false)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    const href = window.prompt('Enter URL');
                                    if (href) {
                                        editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
                                    }
                                }}
                                title="Link"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <MdLink className="h-4 w-4" />
                                    <span className="text-xs font-medium">Link</span>
                                </span>
                            </button>
                            <button
                                type="button"
                                className={buttonClass(false)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={handleInsertImageUrl}
                                title="Picture from URL"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <MdImage className="h-4 w-4" />
                                    <span className="text-xs font-medium">Picture</span>
                                </span>
                            </button>
                            <button
                                type="button"
                                className={buttonClass(false)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => imageUploadRef.current?.click()}
                                title="Upload picture"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <MdImage className="h-4 w-4" />
                                    <span className="text-xs font-medium">Upload</span>
                                </span>
                            </button>
                            <input ref={imageUploadRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            <button
                                type="button"
                                className={buttonClass(false)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => insertTable(3, 3)}
                                title="Insert table"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <MdTableChart className="h-4 w-4" />
                                    <span className="text-xs font-medium">Table</span>
                                </span>
                            </button>
                            <button type="button" className={buttonClass(false)} onMouseDown={(event) => event.preventDefault()} onClick={() => insertTable(2, 2)} title="Quick 2x2 table">
                                <span className="text-xs font-medium">2x2</span>
                            </button>
                            <button type="button" className={buttonClass(false)} onMouseDown={(event) => event.preventDefault()} onClick={() => insertTable(3, 4)} title="Quick 3x4 table">
                                <span className="text-xs font-medium">3x4</span>
                            </button>
                            <button type="button" className={buttonClass(false)} onMouseDown={(event) => event.preventDefault()} onClick={() => insertTable(4, 4)} title="Quick 4x4 table">
                                <span className="text-xs font-medium">4x4</span>
                            </button>
                            <button
                                type="button"
                                className={buttonClass(false)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={handleInsertPageBreak}
                                title="Page break"
                            >
                                <span className="text-xs font-medium">Page Break</span>
                            </button>
                        </RibbonGroup>

                        {imageIsActive ? (
                            <RibbonGroup title="Picture Tools">
                                <button type="button" className={buttonClass(imageIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={handleReplaceImageUrl} title="Replace picture URL">
                                    <span className="text-xs font-medium">Replace</span>
                                </button>
                                <button type="button" className={buttonClass(imageIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => imageUploadRef.current?.click()} title="Upload replacement picture">
                                    <span className="text-xs font-medium">Upload</span>
                                </button>
                                <button type="button" className={buttonClass(imageIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={handleDeleteImage} title="Delete picture">
                                    <span className="text-xs font-medium">Delete</span>
                                </button>
                                <button type="button" className={buttonClass(!!imageAttrs.crop)} onMouseDown={(event) => event.preventDefault()} onClick={handleOpenCropDialog} title="Crop picture">
                                    <span className="text-xs font-medium">Crop</span>
                                </button>
                                <button type="button" className={buttonClass(imageAttrs.crop === 'square')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageCrop('square')} title="Crop picture to square">
                                    <span className="text-xs font-medium">1:1</span>
                                </button>
                                <button type="button" className={buttonClass(imageAttrs.crop === 'widescreen')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageCrop('widescreen')} title="Crop picture to widescreen">
                                    <span className="text-xs font-medium">16:9</span>
                                </button>
                                <button type="button" className={buttonClass(imageAttrs.crop === 'portrait')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageCrop('portrait')} title="Crop picture to portrait">
                                    <span className="text-xs font-medium">4:5</span>
                                </button>
                                <button type="button" className={buttonClass(!imageAttrs.crop)} onMouseDown={(event) => event.preventDefault()} onClick={clearImageCrop} title="Remove crop">
                                    <span className="text-xs font-medium">No Crop</span>
                                </button>
                                <button type="button" className={buttonClass(pictureAdvancedOpen)} onMouseDown={(event) => event.preventDefault()} onClick={() => setPictureAdvancedOpen((value) => !value)} title="Show more picture options">
                                    <span className="text-xs font-medium">More</span>
                                </button>
                                {pictureAdvancedOpen ? (
                                    <>
                                        <button type="button" className={buttonClass(imageAttrs.alignment === 'left' && !imageAttrs.wrap)} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageAlignment('left')} title="Align picture left">
                                            <span className="text-xs font-medium">Left</span>
                                        </button>
                                        <button type="button" className={buttonClass(imageAttrs.alignment === 'center' && !imageAttrs.wrap)} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageAlignment('center')} title="Align picture center">
                                            <span className="text-xs font-medium">Center</span>
                                        </button>
                                        <button type="button" className={buttonClass(imageAttrs.alignment === 'right' && !imageAttrs.wrap)} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageAlignment('right')} title="Align picture right">
                                            <span className="text-xs font-medium">Right</span>
                                        </button>
                                        <button type="button" className={buttonClass(imageAttrs.wrap === 'left')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageWrap('left')} title="Wrap text left of picture">
                                            <span className="text-xs font-medium">Wrap L</span>
                                        </button>
                                        <button type="button" className={buttonClass(imageAttrs.wrap === 'right')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageWrap('right')} title="Wrap text right of picture">
                                            <span className="text-xs font-medium">Wrap R</span>
                                        </button>
                                        <button type="button" className={buttonClass(!imageAttrs.alignment && !imageAttrs.wrap)} onMouseDown={(event) => event.preventDefault()} onClick={clearImageLayout} title="Clear picture layout">
                                            <span className="text-xs font-medium">Reset</span>
                                        </button>
                                        <button type="button" className={buttonClass(imageAttrs.width === '240px')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageWidth('240px')} title="Small picture">
                                            <span className="text-xs font-medium">S</span>
                                        </button>
                                        <button type="button" className={buttonClass(imageAttrs.width === '360px')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageWidth('360px')} title="Medium picture">
                                            <span className="text-xs font-medium">M</span>
                                        </button>
                                        <button type="button" className={buttonClass(imageAttrs.width === '520px')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageWidth('520px')} title="Large picture">
                                            <span className="text-xs font-medium">L</span>
                                        </button>
                                        <button type="button" className={buttonClass(imageAttrs.width === '100%')} onMouseDown={(event) => event.preventDefault()} onClick={() => setImageWidth('100%')} title="Full width picture">
                                            <span className="text-xs font-medium">Full</span>
                                        </button>
                                        <button type="button" className={buttonClass(!imageAttrs.width)} onMouseDown={(event) => event.preventDefault()} onClick={clearImageWidth} title="Clear picture size">
                                            <span className="text-xs font-medium">Auto</span>
                                        </button>
                                        <button type="button" className={buttonClass(!!imageAttrs.width)} onMouseDown={(event) => event.preventDefault()} onClick={handleCustomImageWidth} title="Custom picture width">
                                            <span className="text-xs font-medium">Custom</span>
                                        </button>
                                    </>
                                ) : null}
                            </RibbonGroup>
                        ) : null}

                        {tableIsActive ? (
                            <RibbonGroup title="Table Tools">
                                {tableBodyCellIsActive ? (
                                    <>
                                        <button type="button" className={buttonClass(tableCellIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('addColumnBefore')} title="Add column before">
                                            <span className="text-xs font-medium">Col Before</span>
                                        </button>
                                        <button type="button" className={buttonClass(tableCellIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('addColumnAfter')} title="Add column after">
                                            <span className="text-xs font-medium">Col After</span>
                                        </button>
                                        <button type="button" className={buttonClass(tableCellIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('addRowBefore')} title="Add row before">
                                            <span className="text-xs font-medium">Row Before</span>
                                        </button>
                                        <button type="button" className={buttonClass(tableCellIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('addRowAfter')} title="Add row after">
                                            <span className="text-xs font-medium">Row After</span>
                                        </button>
                                        <button type="button" className={buttonClass(tableCellIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('deleteRow')} title="Delete row">
                                            <span className="text-xs font-medium">Del Row</span>
                                        </button>
                                        <button type="button" className={buttonClass(tableCellIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('deleteColumn')} title="Delete column">
                                            <span className="text-xs font-medium">Del Col</span>
                                        </button>
                                    </>
                                ) : null}
                                <button type="button" className={buttonClass(true)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('deleteTable')} title="Delete table">
                                    <span className="text-xs font-medium">Del Table</span>
                                </button>
                                {tableBodyCellIsActive ? (
                                    <>
                                        <button type="button" className={buttonClass(tableCellIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('mergeCells')} title="Merge cells">
                                            <span className="text-xs font-medium">Merge</span>
                                        </button>
                                        <button type="button" className={buttonClass(tableCellIsActive)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('splitCell')} title="Split cell">
                                            <span className="text-xs font-medium">Split</span>
                                        </button>
                                    </>
                                ) : null}
                                {tableHeaderIsActive ? (
                                    <>
                                        <button type="button" className={buttonClass(true)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('toggleHeaderRow')} title="Toggle header row">
                                            <span className="text-xs font-medium">Header Row</span>
                                        </button>
                                        <button type="button" className={buttonClass(true)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('toggleHeaderColumn')} title="Toggle header column">
                                            <span className="text-xs font-medium">Header Col</span>
                                        </button>
                                        <button type="button" className={buttonClass(true)} onMouseDown={(event) => event.preventDefault()} onClick={() => tableAction('toggleHeaderCell')} title="Toggle header cell">
                                            <span className="text-xs font-medium">Header Cell</span>
                                        </button>
                                    </>
                                ) : null}
                            </RibbonGroup>
                        ) : null}
                    </>
                ) : null}

                {activeTab === 'review' ? (
                    <>
                        <RibbonGroup title="Review">
                            <div className="relative">
                                <button
                                    ref={copilotButtonRef}
                                    type="button"
                                    className={buttonClass(copilotOpen)}
                                    onClick={(event) => {
                                        const nextOpen = !copilotOpen;
                                        if (nextOpen) {
                                            const rect = event.currentTarget.getBoundingClientRect();
                                            const panelWidth = 288;
                                            setCopilotMenuPosition({
                                                top: Math.min(rect.bottom + 8, window.innerHeight - 24),
                                                left: Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12)),
                                            });
                                        }
                                        setCopilotOpen(nextOpen);
                                    }}
                                    title="AI Co-Pilot"
                                    disabled={coPilotLoading}
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <MdSummarize className="h-4 w-4" />
                                        <span className="text-xs font-medium">AI Co-Pilot</span>
                                    </span>
                                </button>
                                {copilotOpen ? (
                                    <div className="fixed inset-0 z-50" onMouseDown={() => setCopilotOpen(false)}>
                                        <div
                                            className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
                                            style={{ position: 'fixed', top: `${copilotMenuPosition.top}px`, left: `${copilotMenuPosition.left}px`, width: '18rem', maxHeight: 'calc(100vh - 24px)' }}
                                            onMouseDown={(event) => event.stopPropagation()}
                                        >
                                            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Choose an action</div>
                                            {aiOptions.map((option) => (
                                                <button
                                                    key={option.key}
                                                    type="button"
                                                    className="flex w-full items-start rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                                    onClick={() => {
                                                        onCoPilotAction(option.key);
                                                        setCopilotOpen(false);
                                                    }}
                                                >
                                                    <span>
                                                        <span className="font-medium">{option.label}</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <button type="button" className={buttonClass(reviewAdvancedOpen)} onMouseDown={(event) => event.preventDefault()} onClick={() => setReviewAdvancedOpen((value) => !value)} title="Show more review options">
                                <span className="text-xs font-medium">More</span>
                            </button>
                            {reviewAdvancedOpen ? (
                                <div className="mt-3 flex flex-col gap-2">
                                    <textarea
                                        className="min-h-20 w-64 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700"
                                        placeholder="Write a comment note"
                                        value={commentText}
                                        onChange={(event) => setCommentText(event.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button type="button" className={buttonClass(false)} onClick={handleInsertComment} title="Insert comment note">
                                            <span className="text-xs font-medium">Add Comment</span>
                                        </button>
                                        <button type="button" className={buttonClass(false)} onClick={handleFindReplace} title="Find and replace">
                                            <span className="text-xs font-medium">Find/Replace</span>
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </RibbonGroup>
                    </>
                ) : null}
            </div>

            <ImageCropDialog
                open={cropDialogOpen}
                src={cropSource}
                onClose={() => {
                    setCropDialogOpen(false);
                    setCropSource('');
                }}
                onSave={handleApplyCroppedImage}
            />
        </div>
    );
}

function CollaborativeEditor({ documentId }) {
    const ydoc = useMemo(() => new Y.Doc(), []);
    const [docId, setDocId] = useState(null);
    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [collabStatus, setCollabStatus] = useState('connecting');
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
            StyledImage.configure({ inline: false, allowBase64: true }),
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

            const room = liveblocksClient.enterRoom(`mooreresearch-collab-room-${data.id}`);
            providerInstance = new LiveblocksYjsProvider(room, ydoc);
            providerInstance.on('status', ({ status }) => {
                setCollabStatus(status === 'connected' ? 'connected' : 'connecting');
            });
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
            setCollabStatus('connecting');
            providerInstance?.destroy();
        };
    }, [editor, ydoc, documentId]);

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
        <div className="mx-auto mt-10 flex max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.12)] relative max-h-[calc(100vh-5rem)]">
            {errorMessage ? (
                <div className="p-6 text-red-700">{errorMessage}</div>
            ) : editor ? (
                <div className="flex min-h-0 flex-1 flex-col p-3.5 sm:p-4">
                    <div className={`mb-3 rounded-xl border px-3 py-2 text-sm ${collabStatus === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        {collabStatus === 'connected'
                            ? 'Collaboration connected via Liveblocks.'
                            : 'Connecting collaboration session...'}
                        </div>
                    <MenuBar
                        editor={editor}
                        onSave={handleSave}
                        onCoPilotAction={handleCoPilotAction}
                        copilotOpen={copilotOpen}
                        setCopilotOpen={setCopilotOpen}
                        coPilotLoading={coPilotLoading}
                        currentUser={currentUser}
                    />
                    {coPilotLoading ? (
                        <div className="mb-3 text-sm text-slate-600">Generating AI response…</div>
                    ) : null}
                    {aiResult ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 flex items-start justify-between gap-3">
                                <div className="font-semibold text-slate-900">
                                    {aiResult.action === 'summarize'
                                        ? 'AI Summary'
                                        : aiResult.action === 'improve'
                                            ? 'Improved Writing'
                                            : aiResult.action === 'tone'
                                                ? 'Formal Tone Rewrite'
                                                : 'Table/Chart Commentary'}
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-medium leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    onClick={() => setAiResult(null)}
                                    title="Close AI response"
                                    aria-label="Close AI response"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="whitespace-pre-line text-sm text-slate-700">{aiResult.text}</div>
                        </div>
                    ) : null}
                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[1.75rem] border border-slate-200/70 bg-gradient-to-b from-white to-slate-50 p-4 shadow-inner sm:p-6">
                        <div className="editor-page-canvas mx-auto w-full max-w-[210mm] rounded-[1.5rem] border border-slate-200/80 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-white/60 sm:px-8 sm:py-8">
                            <EditorContent editor={editor} />
                        </div>
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