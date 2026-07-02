'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { RoomProvider, useOthers, useMyPresence } from "@liveblocks/react/suspense";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";
// --- NEW IMPORTS ---
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

// --- The Editor Component ---
function CollaborativeEditor() {
  const [doc, setDoc] = useState(null);
  const [provider, setProvider] = useState(null);
 
  // Get user info from Liveblocks
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();

  const editor = useEditor({
    editorProps: {
      attributes: { class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl p-5 focus:outline-none min-h-[300px]' },
    },
  })
 
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(yDoc, { room: "apex-research-demo-room" });

    setDoc(yDoc);
    setProvider(yProvider);
   
    if(editor){
        editor.setOptions({
            extensions: [
                StarterKit.configure({
                    history: false,
                }),
                // --- ADD THE COLLABORATION EXTENSIONS ---
                Collaboration.configure({
                    document: yDoc,
                }),
                CollaborationCursor.configure({
                    provider: yProvider,
                    user: {
                      name: 'Test User ' + Math.floor(Math.random() * 100), // In production, use real user name
                      color: '#f783ac', // In production, use a dynamic color
                    },
                }),
            ],
        })
    }

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return null;
  }
 
  return (
      <div>
          <div className="p-2 text-sm text-gray-500">
              Users online: {others.length + 1}
          </div>
          <EditorContent editor={editor} />
      </div>
  )
}

// --- The Main Page Component ---
export default function Home() {
  const roomId = "apex-research-demo-room";

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null }}
      authEndpoint="/api/liveblocks-auth"
    >
        <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">
            <CollaborativeEditor />
        </div>
    </RoomProvider>
  );
}