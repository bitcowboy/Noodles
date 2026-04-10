'use client';

import { useCanvasStore } from '@/stores/canvasStore';

export default function Toolbar() {
  const nodes = useCanvasStore((s) => s.nodes);
  const createPromptNode = useCanvasStore((s) => s.createPromptNode);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);

  const handleNewPrompt = () => {
    createPromptNode({
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
    });
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <button
        onClick={handleNewPrompt}
        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
      >
        + Prompt
      </button>
      <button
        onClick={clearCanvas}
        className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
      >
        Clear
      </button>
      <div className="flex items-center text-xs text-gray-400 pl-2 border-l border-gray-700">
        {nodes.length} node{nodes.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
