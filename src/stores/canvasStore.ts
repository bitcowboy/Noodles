import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from 'reactflow';
import type { CanvasNode, CanvasEdge, ChatMessage, PromptNode, AnswerNode } from '@/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const defaultModel = 'deepseek-chat';

const COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
const PROMPT_NODE_WIDTH = 380;
const ANSWER_NODE_WIDTH = 520;
const ROOT_PROMPT_START_X = 120;
const ROOT_PROMPT_START_Y = 120;
const ROOT_PROMPT_COLUMN_GAP = 460;
const ROOT_PROMPT_ROW_GAP = 320;
const ROOT_PROMPT_COLUMNS = 3;
const NODE_COLLISION_PADDING = 40;
const PROMPT_EXPANDED_FALLBACK_HEIGHT = 220;
const ANSWER_EXPANDED_FALLBACK_HEIGHT = 320;
const COLLAPSED_NODE_HEIGHT = 70;
const PROMPT_TO_ANSWER_VERTICAL_GAP = 60;
const ANSWER_TO_PROMPT_VERTICAL_GAP = 60;

function getContextChain(nodeId: string, nodes: CanvasNode[], edges: CanvasEdge[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const node = nodes.find((n) => n.id === currentId);
    if (!node) break;

    if (node.type === 'prompt') {
      const promptNode = node as PromptNode;
      if (promptNode.data.prompt) {
        messages.unshift({
          id: generateId(),
          role: 'user',
          content: promptNode.data.prompt,
          timestamp: Date.now(),
        });
      }
    } else if (node.type === 'answer') {
      const answerNode = node as AnswerNode;
      messages.unshift(...answerNode.data.messages.map((m) => ({ ...m })));
    }

    // Find incoming edge (from parent)
    const incomingEdge = edges.find((e) => e.target === currentId);
    currentId = incomingEdge?.source ?? null;
  }

  return messages;
}

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNodeId: (nodeId: string | null) => void;
  createPromptNode: (position: { x: number; y: number }) => string;
  sendPrompt: (promptNodeId: string) => Promise<void>;
  createBranch: (answerNodeId: string, selectedText: string, position: { x: number; y: number }) => string;
  submitPromptFromSelection: (prompt: string) => Promise<void>;
  setPrompt: (nodeId: string, prompt: string) => void;
  updateAnswerContent: (answerNodeId: string, content: string) => void;
  setNodeModel: (nodeId: string, model: string) => void;
  setNodeLabel: (nodeId: string, label: string) => void;
  setNodeColor: (nodeId: string, color: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  clearCanvas: () => void;
}

// Helper to update a node in the nodes array while preserving union typing
function updateNode(nodes: CanvasNode[], nodeId: string, updater: (node: CanvasNode) => Record<string, unknown>): CanvasNode[] {
  return nodes.map((n) => (n.id === nodeId ? { ...n, ...updater(n) } : n)) as CanvasNode[];
}

function getNodeHeight(node: CanvasNode): number {
  const nodeWithMeasured = node as CanvasNode & { measured?: { height?: number } };
  if (typeof nodeWithMeasured.measured?.height === 'number') return nodeWithMeasured.measured.height;
  if (typeof node.height === 'number') return node.height;
  if (node.data.isCollapsed) return COLLAPSED_NODE_HEIGHT;
  return node.type === 'prompt' ? PROMPT_EXPANDED_FALLBACK_HEIGHT : ANSWER_EXPANDED_FALLBACK_HEIGHT;
}

function getNodeWidth(node: CanvasNode): number {
  return node.type === 'prompt' ? PROMPT_NODE_WIDTH : ANSWER_NODE_WIDTH;
}

function getAnswerNodePosition(promptNode: PromptNode): { x: number; y: number } {
  const promptHandleCenterX = promptNode.position.x + PROMPT_NODE_WIDTH / 2;
  const promptHeight = getNodeHeight(promptNode);
  return {
    x: promptHandleCenterX - ANSWER_NODE_WIDTH / 2,
    y: promptNode.position.y + promptHeight + PROMPT_TO_ANSWER_VERTICAL_GAP,
  };
}

function getChildPromptPosition(answerNode: AnswerNode): { x: number; y: number } {
  const answerHandleCenterX = answerNode.position.x + ANSWER_NODE_WIDTH / 2;
  const answerHeight = getNodeHeight(answerNode);
  return {
    x: answerHandleCenterX - PROMPT_NODE_WIDTH / 2,
    y: answerNode.position.y + answerHeight + ANSWER_TO_PROMPT_VERTICAL_GAP,
  };
}

function getRootPromptPosition(nodes: CanvasNode[]): { x: number; y: number } {
  for (let index = 0; index < 24; index += 1) {
    const column = index % ROOT_PROMPT_COLUMNS;
    const row = Math.floor(index / ROOT_PROMPT_COLUMNS);
    const candidate = {
      x: ROOT_PROMPT_START_X + column * ROOT_PROMPT_COLUMN_GAP,
      y: ROOT_PROMPT_START_Y + row * ROOT_PROMPT_ROW_GAP,
    };

    const overlapsExistingNode = nodes.some((node) => {
      const width = getNodeWidth(node);
      const height = getNodeHeight(node);
      return !(
        candidate.x + PROMPT_NODE_WIDTH + NODE_COLLISION_PADDING <= node.position.x ||
        candidate.x >= node.position.x + width + NODE_COLLISION_PADDING ||
        candidate.y + PROMPT_EXPANDED_FALLBACK_HEIGHT + NODE_COLLISION_PADDING <= node.position.y ||
        candidate.y >= node.position.y + height + NODE_COLLISION_PADDING
      );
    });

    if (!overlapsExistingNode) return candidate;
  }

  return {
    x: ROOT_PROMPT_START_X,
    y: ROOT_PROMPT_START_Y + Math.ceil(nodes.length / ROOT_PROMPT_COLUMNS) * ROOT_PROMPT_ROW_GAP,
  };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes as Node[]) as CanvasNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge({ ...connection, animated: true }, get().edges),
    });
  },

  setSelectedNodeId: (nodeId) => {
    set((state) => (
      state.selectedNodeId === nodeId
        ? state
        : { selectedNodeId: nodeId }
    ));
  },

  createPromptNode: (position) => {
    const state = get();
    const id = `prompt-${generateId()}`;
    const node: PromptNode = {
      id,
      type: 'prompt',
      position,
      data: {
        label: `Prompt ${state.nodes.filter((n) => n.type === 'prompt').length + 1}`,
        prompt: '',
        model: defaultModel,
        isWaiting: false,
        color: '',
        isCollapsed: false,
      },
    };
    set({
      nodes: [...state.nodes, node],
      selectedNodeId: id,
    });
    return id;
  },

  submitPromptFromSelection: async (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const state = get();
    const selectedNode = state.selectedNodeId
      ? state.nodes.find((node) => node.id === state.selectedNodeId)
      : undefined;

    if (!selectedNode) {
      const promptNodeId = get().createPromptNode(getRootPromptPosition(state.nodes));
      get().setPrompt(promptNodeId, trimmed);
      void get().sendPrompt(promptNodeId);
      return;
    }

    if (selectedNode.type === 'prompt') {
      const promptNode = selectedNode as PromptNode;
      if (promptNode.data.isWaiting) return;
      get().setPrompt(promptNode.id, trimmed);
      void get().sendPrompt(promptNode.id);
      return;
    }

    const answerNode = selectedNode as AnswerNode;
    if (answerNode.data.isStreaming) return;

    const promptNodeId = get().createBranch(
      answerNode.id,
      '',
      getChildPromptPosition(answerNode)
    );
    get().setPrompt(promptNodeId, trimmed);
    void get().sendPrompt(promptNodeId);
  },

  sendPrompt: async (promptNodeId) => {
    const state = get();
    const promptNode = state.nodes.find((n) => n.id === promptNodeId) as PromptNode | undefined;
    if (!promptNode || !promptNode.data.prompt.trim() || promptNode.data.isWaiting) return;

    // Build context chain from graph traversal
    const contextMessages = getContextChain(promptNodeId, state.nodes, state.edges);

    // Create the user message for this prompt
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: promptNode.data.prompt,
      timestamp: Date.now(),
    };

    // Set prompt node as waiting
    set((s) => ({
      nodes: updateNode(s.nodes, promptNodeId, (n) => ({
        data: { ...(n as PromptNode).data, isWaiting: true },
      })),
    }));

    // Create answer node
    const answerId = `answer-${generateId()}`;
    const answerNode: AnswerNode = {
      id: answerId,
      type: 'answer',
      position: getAnswerNodePosition(promptNode),
      data: {
        label: `Answer ${state.nodes.filter((n) => n.type === 'answer').length + 1}`,
        messages: [userMsg],
        isStreaming: true,
        selectedText: '',
        color: '',
        isCollapsed: false,
      },
    };

    const edge: CanvasEdge = {
      id: `edge-${promptNodeId}-${answerId}`,
      source: promptNodeId,
      target: answerId,
      animated: true,
    };

    set((s) => ({
      nodes: [...s.nodes, answerNode],
      edges: [...s.edges, edge],
      selectedNodeId: answerId,
    }));

    // Add empty assistant message
    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    set((s) => ({
      nodes: updateNode(s.nodes, answerId, (n) => ({
        data: { ...(n as AnswerNode).data, messages: [...(n as AnswerNode).data.messages, assistantMsg] },
      })),
    }));

    try {
      const allMessages = [
        ...contextMessages,
        userMsg,
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          model: promptNode.data.model,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        get().updateAnswerContent(answerId, accumulated);
      }
    } catch (err) {
      console.error('Chat error:', err);
      get().updateAnswerContent(answerId, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id === promptNodeId) {
            const p = n as PromptNode;
            return { ...p, data: { ...p.data, isWaiting: false } };
          }
          if (n.id === answerId) {
            const a = n as AnswerNode;
            return { ...a, data: { ...a.data, isStreaming: false } };
          }
          return n;
        }) as CanvasNode[],
      }));
    }
  },

  createBranch: (answerNodeId, selectedText, position) => {
    const state = get();
    const answerNode = state.nodes.find((n) => n.id === answerNodeId) as AnswerNode | undefined;
    if (!answerNode) return '';

    const branchPrompt = selectedText
      ? `Based on this selected text:\n\n> ${selectedText}`
      : '';

    const id = `prompt-${generateId()}`;
    const node: PromptNode = {
      id,
      type: 'prompt',
      position,
      data: {
        label: `Branch ${state.nodes.filter((n) => n.type === 'prompt').length + 1}`,
        prompt: branchPrompt,
        model: defaultModel,
        isWaiting: false,
        color: '',
        isCollapsed: false,
      },
    };

    const edge: CanvasEdge = {
      id: `edge-${answerNodeId}-${id}`,
      source: answerNodeId,
      target: id,
      animated: true,
    };

    set({
      nodes: [...state.nodes, node],
      edges: [...state.edges, edge],
      selectedNodeId: id,
    });

    return id;
  },

  setPrompt: (nodeId, prompt) => {
    set((state) => ({
      nodes: updateNode(state.nodes, nodeId, (n) => ({
        data: { ...(n as PromptNode).data, prompt },
      })),
    }));
  },

  updateAnswerContent: (answerNodeId, content) => {
    set((state) => ({
      nodes: updateNode(state.nodes, answerNodeId, (n) => {
        const answerNode = n as AnswerNode;
        const messages = [...answerNode.data.messages];
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            messages[i] = { ...messages[i], content };
            break;
          }
        }
        return { data: { ...answerNode.data, messages } };
      }),
    }));
  },

  setNodeModel: (nodeId, model) => {
    set((state) => ({
      nodes: updateNode(state.nodes, nodeId, (n) => ({
        data: { ...(n as PromptNode).data, model },
      })),
    }));
  },

  setNodeLabel: (nodeId, label) => {
    set((state) => ({
      nodes: updateNode(state.nodes, nodeId, (n) => ({
        data: { ...n.data, label },
      })),
    }));
  },

  setNodeColor: (nodeId, color) => {
    set((state) => ({
      nodes: updateNode(state.nodes, nodeId, (n) => ({
        data: { ...n.data, color },
      })),
    }));
  },

  toggleNodeCollapse: (nodeId) => {
    set((state) => ({
      nodes: updateNode(state.nodes, nodeId, (n) => ({
        data: { ...n.data, isCollapsed: !n.data.isCollapsed },
      })),
    }));
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
    });
  },
}));

export { COLORS };
