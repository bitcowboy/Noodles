'use client';

import dynamic from 'next/dynamic';
import Toolbar from '@/components/ui/Toolbar';
import BottomPromptBar from '@/components/ui/BottomPromptBar';

const Canvas = dynamic(() => import('@/components/canvas/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-950 text-gray-400">
      Loading canvas...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-gray-950">
      <div className="absolute inset-0 pb-32">
        <Toolbar />
        <Canvas />
      </div>
      <BottomPromptBar />
    </main>
  );
}
