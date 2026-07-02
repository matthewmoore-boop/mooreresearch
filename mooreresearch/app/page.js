'use client';

import { RoomProvider, ClientSideSuspense } from '@liveblocks/react/suspense';
import dynamic from 'next/dynamic';

// A simple loading fallback
function EditorLoading() {
  return <div className="p-5">Loading editor...</div>;
}

// Dynamically import the Editor component with SSR turned off
const CollaborativeEditor = dynamic(
  () => import('./Editor').then((mod) => mod.CollaborativeEditor),
  {
    ssr: false,
    loading: () => <EditorLoading />,
  }
);

// This is the main Page component
export default function Page() {
  return (
    <RoomProvider
      id="apex-research-demo-room"
      initialPresence={{}}
      authEndpoint="/api/liveblocks-auth"
    >
      <ClientSideSuspense fallback={<EditorLoading />}>
        <CollaborativeEditor />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
