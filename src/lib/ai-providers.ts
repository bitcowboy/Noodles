export const AVAILABLE_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek 3.2' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];

export type Provider = 'anthropic' | 'deepseek';

export function getProviderForModel(model: string): Provider {
  if (model.startsWith('claude-')) {
    return 'anthropic';
  }
  if (model.startsWith('deepseek-')) {
    return 'deepseek';
  }
  return 'deepseek';
}
