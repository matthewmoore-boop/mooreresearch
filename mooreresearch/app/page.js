'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { RoomProvider, useOthers, useMyPresence } from "@liveblocks/react/suspense";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";

// --- The Editor Component ---
function CollaborativeEditor() {
  const [doc, setDoc] = useState(null);
  const [provider, setProvider] = useState(null);

  const editor = useEditor({
    // We will set the content and collaboration settings in useEffect
  })
 
  // This is where you can add multiplayer features
  const others = useOthers();
  const userCount = others.length + 1; // +1 for the current user

  useEffect(() => {
    // A Yjs document holds the shared data
    const yDoc = new Y.Doc();
    // A Liveblocks provider connects to the room and syncs the data
    const yProvider = new LiveblocksYjsProvider(yDoc, {
      // For this demo, we'll use a hardcoded room name
      room: "apex-research-demo-room",
    });

    setDoc(yDoc);
    setProvider(yProvider);
   
    // Configure the editor once the provider is ready
    if(editor){
        editor.setOptions({
            extensions: [
                StarterKit.configure({
                    // The collaboration extension is the magic that connects Tiptap to Yjs
                    history: false, // Liveblocks handles history
                }),
                // Collaboration extension
            ],
            editorProps: {
                attributes: { class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl p-5 focus:outline-none min-h-[300px]' },
            },
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
              Users online: {userCount}
          </div>
          <EditorContent editor={editor} />
      </div>
  )
}

// --- The Main Page Component which provides the Liveblocks context ---
export default function Home() {
  // For this demo, a hardcoded room name is fine.
  // In production, this would be the unique ID of the document.
  const roomId = "apex-research-demo-room";

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      // The auth endpoint you just created
      authEndpoint="/api/liveblocks-auth"
    >
        <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg">
            <CollaborativeEditor />
        </div>
    </RoomProvider>
  );
}