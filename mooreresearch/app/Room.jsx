"use client";

import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense"; // Import ClientSideSuspense
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from "yjs";
import { useEffect, useState } from "react";
import { useOthers, useSelf } from "@liveblocks/react/suspense";

// A loading spinner to show while the collaborative editor is connecting
function LoadingSpinner() {
    return <div className="p-5">Connecting to the document...</div>;
}

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

export function CollaborativeApp() {
    // This component uses Liveblocks hooks, so it must be wrapped
    const others = useOthers();
    const userCount = others.length + 1;

    return (
        <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">
           <div className="p-2 text-sm text-gray-500">
               Users online: {userCount}
           </div>
           <Editor />
       </div>
    )
}

export default function Page() {
  const roomId = "apex-research-demo-room";

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      authEndpoint="/api/liveblocks-auth"
    >
      {/*
        Use ClientSideSuspense to only render the collaborative components
        on the client side. This will avoid the server-side rendering error.
      */}
      <ClientSideSuspense fallback={<LoadingSpinner />}>
          <CollaborativeApp />
      </ClientSideSuspense>
    </RoomProvider>
  );
}