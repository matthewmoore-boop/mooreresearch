"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveblocksProvider, RoomProvider, useThreads } from "@liveblocks/react";
import { liveblocksConfig, LiveblocksPlugin, FloatingComposer, FloatingThreads } from "@liveblocks/react-lexical";

// A loading spinner
function Loading() {
  return <div className="p-5">Loading editor...</div>;
}

// The main editor component
function CollaborativeEditor() {
  const { threads } = useThreads();

  const initialConfig = liveblocksConfig({
    namespace: "apex-research-editor",
    theme: {},
    nodes: [],
    onError: (err) => console.error(err),
  });

  return (
    <div className="max-w-4xl mx-auto mt-10 border border-gray-300 rounded-lg shadow-lg relative">
      <LexicalComposer initialConfig={initialConfig}>
        <LiveblocksPlugin>
          <div className="relative">
            <RichTextPlugin
              contentEditable={<ContentEditable className="p-5 focus:outline-none min-h-[300px]" />}
              placeholder={<div className="p-5 absolute top-0 left-0 pointer-events-none text-gray-400">Start typing...</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <FloatingComposer />
            <FloatingThreads threads={threads} />
          </div>
        </LiveblocksPlugin>
      </LexicalComposer>
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
