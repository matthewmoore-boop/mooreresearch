'use client';

export const dynamic = 'force-dynamic'; // <-- THE CRITICAL NEW LINE



import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import { RoomProvider, ClientSideSuspense } from '@liveblocks/react/suspense';
import { useSelf, useOthers } from "@liveblocks/react/suspense";
import { useEffect, useState } from 'react';

// The actual editor component
function CollaborativeEditor() {
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
       
        if(editor){
            editor.setOptions({
                extensions: [
                    StarterKit.configure({ history: false }),
                    Collaboration.configure({ document: yDoc }),
                    CollaborationCursor.configure({
                        provider: yProvider,
                        user: userInfo || { name: 'Anonymous', color: '#000000'},
                    }),
                ],
                content: yDoc.getXmlFragment('prosemirror'),
            })
        }
        return () => {
          yDoc?.destroy();
          yProvider?.destroy();
        };
    }, [editor, userInfo]);

    return (
        <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">
            <div className="p-2 text-sm text-gray-500">
                {others.map(({ connectionId, info }) => (
                    <span key={connectionId} style={{ color: info.color }}>
                        ● {info.name}
                    </span>
                ))}
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

// The parent component that provides the Liveblocks context
export default function Page() {
  return (
    <RoomProvider
      id="apex-research-demo-room"
      initialPresence={{}}
      authEndpoint="/api/liveblocks-auth"
    >
      <ClientSideSuspense fallback={<div>Loading...</div>}>
          <CollaborativeEditor />
      </ClientSideSuspense>
    </RoomProvider>
  );
}