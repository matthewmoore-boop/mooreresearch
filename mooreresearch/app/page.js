'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

function LoadingSpinner() {
  return <div className="p-5">Loading Editor...</div>;
}

// Use next/dynamic to load the editor component only on the client side
const CollaborativeEditor = dynamic(
  () => import('./components/Editor'), // Assuming Editor.jsx is in a components folder
  {
    ssr: false, // This is the crucial part
    suspense: true,
    loading: () => <LoadingSpinner />
  }
)

export default function Page() {
  return (
    <div>
        <Suspense fallback={<LoadingSpinner />}>
            <CollaborativeEditor />
        </Suspense>
    </div>
  );
}