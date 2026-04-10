'use client';

import { useMemo, useState } from 'react';
import TextInput from '@/components/ui/TextInput';
import { useCanvasStore } from '@/stores/canvasStore';
import type { AnswerNode, PromptNode } from '@/types';

export default function BottomPromptBar() {
  const [input, setInput] = useState('');

  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const submitPromptFromSelection = useCanvasStore((s) => s.submitPromptFromSelection);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  let isBusy = false;
  let contextLabel = 'New root prompt';
  let placeholder = 'Ask a new question...';

  if (selectedNode?.type === 'prompt') {
    const promptNode = selectedNode as PromptNode;
    isBusy = promptNode.data.isWaiting;
    contextLabel = `Follow ${promptNode.data.label}`;
    placeholder = `Continue with ${promptNode.data.label}...`;
  } else if (selectedNode?.type === 'answer') {
    const answerNode = selectedNode as AnswerNode;
    isBusy = answerNode.data.isStreaming;
    contextLabel = `Branch from ${answerNode.data.label}`;
    placeholder = `Branch from ${answerNode.data.label}...`;
  }

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    setInput('');
    void submitPromptFromSelection(trimmed);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-700 bg-gray-900/95 p-3 shadow-2xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <span className="text-xs font-medium text-gray-300">{contextLabel}</span>
          <span className="text-xs text-gray-500">Enter to send, Shift+Enter for newline</span>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={isBusy}
              placeholder={placeholder}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isBusy}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
