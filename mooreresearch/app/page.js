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

  function MenuBar({ editor }) {
    if (!editor) return null;

    const btn = (onClick, active, label) => (
      <button
        type="button"
        onClick={onClick}
        className={`mr-2 px-2 py-1 rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100"}`}
      >
        {label}
      </button>
    );

    return (
      <div className="mb-3">
        {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), "B")}
        {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), "I")}
        {btn(() => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"), "S")}
        {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }), "H1")}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }), "H2")}
        {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"), "• List")}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"), "1. List")}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), '"')}
        {btn(() => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock"), "</>")}
        {btn(() => editor.chain().focus().undo().run(), false, "Undo")}
        {btn(() => editor.chain().focus().redo().run(), false, "Redo")}
        {btn(() => editor.chain().focus().clearNodes().unsetAllMarks().run(), false, "Clear")}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg relative">
      <div className="p-4">
        <MenuBar editor={editor} />

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
