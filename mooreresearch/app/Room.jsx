"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from "yjs";
import { useEffect, useState } from "react";
import { useOthers, useSelf } from "@liveblocks/react/suspense";


function Editor() {
  const [doc, setDoc] = useState(null);
  const [provider, setProvider] = useState(null);
  const userInfo = useSelf(me => me.info);

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
                    user: userInfo || { name: "Anonymous", color: "#000000" },
                }),
            ],
        })
    }
    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [editor, userInfo]);

  return <EditorContent editor={editor} />;
}


function Room({ children }) {
  return (
    <RoomProvider id="apex-research-demo-room"
      initialPresence={{}}
      authEndpoint="/api/liveblocks-auth"
    >
        {children}
    </RoomProvider>
  );
}

export function CollaborativeApp() {
    const others = useOthers();
    const userCount = others.length + 1;
    return (
        <Room>
             <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">
                <div className="p-2 text-sm text-gray-500">
                    Users online: {userCount}
                </div>
                <Editor />
            </div>
        </Room>
    )
}
