import Anthropic from '@anthropic-ai/sdk';
import { type NextRequest, NextResponse } from 'next/server';
import { getProviderForModel } from '@/lib/ai-providers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model } = body as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      model: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 });
    }

    const provider = getProviderForModel(model);

    if (provider === 'anthropic') {
      const anthropic = new Anthropic();

      const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
      const chatMessages = messages.filter(
        (m: { role: string }) => m.role === 'user' || m.role === 'assistant'
      ) as { role: 'user' | 'assistant'; content: string }[];

      const stream = await anthropic.messages.stream({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemMessage?.content || undefined,
        messages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
          } catch (err) {
            console.error('Stream error:', err);
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    if (provider === 'deepseek') {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
              },
              body: JSON.stringify({
                model: model || 'deepseek-chat',
                messages: messages.map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
                max_tokens: 4096,
                stream: true,
              }),
            });

            if (!response.ok) {
              const errText = await response.text();
              console.error('DeepSeek API error:', response.status, errText);
              controller.enqueue(encoder.encode(`DeepSeek error: ${response.status}`));
              controller.close();
              return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.choices?.[0]?.delta?.content;
                  if (text) {
                    controller.enqueue(encoder.encode(text));
                  }
                } catch {
                  // skip malformed JSON chunks
                }
              }
            }
          } catch (err) {
            console.error('DeepSeek stream error:', err);
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
