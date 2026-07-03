'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
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
                    StarterKit.configure({ history: false }),
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

    return (
        <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">
            <div className="p-2 text-sm text-gray-500">
                Users online: {others.length + 1}
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
