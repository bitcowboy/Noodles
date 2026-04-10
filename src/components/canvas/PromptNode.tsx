'use client';

import { useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useCanvasStore, COLORS } from '@/stores/canvasStore';
import { AVAILABLE_MODELS } from '@/lib/ai-providers';
import type { PromptNodeData } from '@/types';
import TextInput from '@/components/ui/TextInput';

export default function PromptNode({ id, data, selected }: NodeProps<PromptNodeData>) {
  const [input, setInput] = useState('');
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(data.label);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const sendPrompt = useCanvasStore((s) => s.sendPrompt);
  const setPrompt = useCanvasStore((s) => s.setPrompt);
  const setNodeModel = useCanvasStore((s) => s.setNodeModel);
  const setNodeLabel = useCanvasStore((s) => s.setNodeLabel);
  const setNodeColor = useCanvasStore((s) => s.setNodeColor);
  const toggleNodeCollapse = useCanvasStore((s) => s.toggleNodeCollapse);

  const hasSent = data.prompt.length > 0;

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || data.isWaiting) return;
    setPrompt(id, trimmed);
    setInput('');
    queueMicrotask(() => sendPrompt(id));
  }, [input, data.isWaiting, id, sendPrompt, setPrompt]);

  const handleLabelSave = () => {
    setIsEditingLabel(false);
    if (labelDraft.trim()) {
      setNodeLabel(id, labelDraft.trim());
    } else {
      setLabelDraft(data.label);
    }
  };

  const containerClassName = selected
    ? 'bg-gray-900 border rounded-xl shadow-2xl ring-2 ring-blue-500/80 ring-offset-2 ring-offset-gray-950'
    : 'bg-gray-900 border rounded-xl shadow-2xl';
  const collapsedContainerClassName = selected
    ? 'bg-gray-900 border rounded-lg shadow-lg ring-2 ring-blue-500/80 ring-offset-2 ring-offset-gray-950'
    : 'bg-gray-900 border rounded-lg shadow-lg';

  if (data.isCollapsed) {
    return (
      <div
        className={`${collapsedContainerClassName} w-[240px] p-2`}
        style={{ borderColor: data.color || undefined }}
      >
        <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
        <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-medium text-gray-300 truncate">{data.label}</span>
          <button
            onClick={() => toggleNodeCollapse(id)}
            className="text-gray-400 hover:text-white text-xs shrink-0"
          >
            +
          </button>
        </div>
        {data.prompt && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            {data.prompt.slice(0, 40)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${containerClassName} w-[380px]`}
      style={{ borderColor: data.color || undefined }}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-1.5">
          {isEditingLabel ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={handleLabelSave}
              onKeyDown={(e) => e.key === 'Enter' && handleLabelSave()}
              className="text-sm bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-gray-200 w-28 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <span
              onDoubleClick={() => {
                setLabelDraft(data.label);
                setIsEditingLabel(true);
              }}
              className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white"
              title="Double-click to rename"
            >
              {data.label}
            </span>
          )}
          {data.isWaiting && (
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              Waiting...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={data.model}
            onChange={(e) => setNodeModel(id, e.target.value)}
            className="text-xs bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-gray-300 focus:outline-none"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-4 h-4 rounded-full border border-gray-600 shrink-0"
              style={{ backgroundColor: data.color || '#6b7280' }}
              title="Set color"
            />
            {showColorPicker && (
              <div className="absolute top-5 right-0 z-50 flex gap-1 bg-gray-800 border border-gray-600 rounded p-1.5 shadow-xl">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setNodeColor(id, c);
                      setShowColorPicker(false);
                    }}
                    className="w-5 h-5 rounded-full border border-gray-500 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c || '#6b7280' }}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => toggleNodeCollapse(id)}
            className="text-gray-400 hover:text-white text-sm leading-none"
            title="Collapse"
          >
            −
          </button>
        </div>
      </div>

      {/* Content */}
      {hasSent ? (
        <div className="px-3 py-2">
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{data.prompt}</p>
        </div>
      ) : (
        <div className="px-3 py-2">
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            disabled={data.isWaiting}
            placeholder="Type your prompt... (Enter to send)"
          />
          <button
            onClick={handleSend}
            disabled={data.isWaiting || !input.trim()}
            className="mt-2 w-full py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-colors"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
