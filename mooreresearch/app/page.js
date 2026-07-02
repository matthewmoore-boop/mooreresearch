'use client'; // This file is now also a client component

import { RoomProvider, ClientSideSuspense } from '@liveblocks/react/suspense';
import CollaborativeEditor from './components/Editor'; // Import the new component

function LoadingSpinner() {
  return <div className="p-5">Connecting to the document...</div>;
}

export default function Page() {
  return (
    <RoomProvider
      id="apex-research-demo-room"
      initialPresence={{}}
      authEndpoint="/api/liveblocks-auth"
    >
      <ClientSideSuspense fallback={<LoadingSpinner />}>
        <CollaborativeEditor />
      </ClientSideSuspense>
    </RoomProvider>
  );
}