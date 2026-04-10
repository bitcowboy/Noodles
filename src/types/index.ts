import type { Node, Edge } from 'reactflow';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface PromptNodeData {
  label: string;
  prompt: string;
  model: string;
  isWaiting: boolean;
  color?: string;
  isCollapsed: boolean;
}

export interface AnswerNodeData {
  label: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  selectedText: string;
  color?: string;
  isCollapsed: boolean;
}

export type PromptNode = Node<PromptNodeData>;
export type AnswerNode = Node<AnswerNodeData>;
export type CanvasNode = PromptNode | AnswerNode;
export type CanvasEdge = Edge;
