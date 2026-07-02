"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react/suspense";

function LoadingSpinner() {
  return <div className="p-5">Loading...</div>;
}

export function Room({ children }) {
  return (
    <RoomProvider id="apex-research-demo-room"
      initialPresence={{}}
      authEndpoint="/api/liveblocks-auth"
    >
      <ClientSideSuspense fallback={<LoadingSpinner />}>
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}