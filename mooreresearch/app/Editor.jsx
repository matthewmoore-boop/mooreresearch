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
import {
    MdFormatBold,
    MdFormatItalic,
    MdFormatUnderlined,
    MdFormatListBulleted,
    MdFormatListNumbered,
    MdFormatAlignLeft,
    MdFormatAlignCenter,
    MdFormatAlignRight,
    MdUndo,
    MdRedo,
    MdTextFields
} from 'react-icons/md';

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
                        <MdFormatBold className="h-5 w-5" />
                    </Btn>
                    <Btn
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Italic"
                    >
                        <MdFormatItalic className="h-5 w-5 italic" />
                    </Btn>
                    <Btn
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        title="Underline"
                    >
                        <MdFormatUnderlined className="h-5 w-5" />
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
                        <MdFormatListBulleted className="h-5 w-5" />
                    </Btn>
                    <Btn
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        title="Numbered list"
                    >
                        <MdFormatListNumbered className="h-5 w-5" />
                    </Btn>
                </div>

                <div className="flex items-center gap-1">
                    <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
                        <MdFormatAlignLeft className="h-5 w-5" />
                    </Btn>
                    <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">
                        <MdFormatAlignCenter className="h-5 w-5" />
                    </Btn>
                    <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
                        <MdFormatAlignRight className="h-5 w-5" />
                    </Btn>
                </div>
                <div className="flex items-center gap-1">
                    <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo">
                        <MdUndo className="h-5 w-5" />
                    </Btn>
                    <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo">
                        <MdRedo className="h-5 w-5" />
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
