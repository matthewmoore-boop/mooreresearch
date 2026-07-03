"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";

// A loading spinner
function Loading() {
  return <div className="p-5">Loading editor...</div>;
}

// The main editor component
function CollaborativeEditor() {
  // Create a Y.Doc and WebSocket provider for real-time collaboration
  const roomName = "apex-research-room";
  const ydoc = new Y.Doc();
  const provider = typeof window !== "undefined" ? new WebsocketProvider("wss://demos.yjs.dev", roomName, ydoc) : null;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
    ],
    content: "<p>Start typing...</p>",
  });

  return (
    <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg relative">
      <div className="p-4">
        <div className="mb-2">
          <button
            type="button"
            onClick={() => editor && editor.chain().focus().toggleBold().run()}
            className="mr-2 px-2 py-1 bg-gray-100 rounded"
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor && editor.chain().focus().toggleItalic().run()}
            className="mr-2 px-2 py-1 bg-gray-100 rounded"
          >
            Italic
          </button>
        </div>

        <div className="p-5 min-h-[300px] bg-white rounded">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

// The main page component that provides the Liveblocks context
export default function Page() {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id="apex-research-demo-room"
        initialPresence={{}}
        initialStorage={{}}
      >
        <ClientSideSuspense fallback={<Loading />}>
          <CollaborativeEditor />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
