import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, badRequest, internalError, notFound } from '../shared/response.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  context?: {
    batteryLevel?: number;
    nearestStation?: string;
    activeReservation?: boolean;
    recentSwaps?: number;
    walletBalance?: number;
  };
}

interface ChatResponse {
  reply: string;
  suggestedPrompts: string[];
  actionable?: {
    type: 'navigate' | 'reserve' | 'info';
    target?: string;
  };
}

const SUGGESTED_PROMPTS = [
  'When should I swap today?',
  'Which station is cheapest?',
  "How's my battery health?",
  'Show my savings',
];

/**
 * AI Assistant Lambda Handler
 * Provides conversational AI for drivers with contextual responses.
 *
 * For hackathon MVP: Uses pattern-matching on common questions
 * with contextual responses. In production, this would use Amazon Bedrock.
 *
 * Endpoint:
 * - POST /v1/ai/chat — Accept user message, return AI response
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { httpMethod, path } = event;

  try {
    if (httpMethod === 'OPTIONS') {
      return success({ message: 'OK' });
    }

    if (httpMethod === 'POST' && path === '/v1/ai/chat') {
      return handleChat(event);
    }

    return notFound('Route not found');
  } catch (err) {
    console.error('AI Assistant handler error:', err);
    return internalError();
  }
}

/**
 * POST /v1/ai/chat
 * Process user message and return contextual AI response.
 */
function handleChat(event: APIGatewayProxyEvent): APIGatewayProxyResult {
  if (!event.body) {
    return badRequest('Request body is required');
  }

  let body: ChatRequest;
  try {
    body = JSON.parse(event.body);
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    return badRequest('Message field is required and must be non-empty');
  }

  if (body.message.length > 500) {
    return badRequest('Message must be 500 characters or fewer');
  }

  const response = generateResponse(body.message.toLowerCase().trim(), body.context);

  return success({
    reply: response.reply,
    suggestedPrompts: response.suggestedPrompts,
    actionable: response.actionable,
    respondedAt: new Date().toISOString(),
  });
}

/**
 * Pattern-matching response generator for hackathon MVP.
 * Matches common driver questions and provides contextual answers.
 */
function generateResponse(
  message: string,
  context?: ChatRequest['context']
): ChatResponse {
  const batteryLevel = context?.batteryLevel ?? 65;
  const nearestStation = context?.nearestStation ?? 'Yaba Hub';
  const walletBalance = context?.walletBalance ?? 3500;

  // Pattern: When to swap / swap time
  if (message.includes('when') && (message.includes('swap') || message.includes('charge'))) {
    if (batteryLevel <= 20) {
      return {
        reply: `Your battery is at ${batteryLevel}% — I'd recommend swapping now! ${nearestStation} is your closest station with batteries available. The current wait time is about 3 minutes.`,
        suggestedPrompts: ['Navigate to station', 'Reserve a battery', 'Show alternatives'],
        actionable: { type: 'navigate', target: nearestStation },
      };
    }
    if (batteryLevel <= 40) {
      return {
        reply: `Your battery is at ${batteryLevel}%. Based on current traffic patterns, I'd suggest swapping within the next hour. ${nearestStation} typically has shorter queues between 10:00-11:00 AM. Want me to set a reminder?`,
        suggestedPrompts: ['Reserve for later', 'Show station availability', 'Set reminder'],
        actionable: { type: 'info' },
      };
    }
    return {
      reply: `Your battery is at ${batteryLevel}% — you're good for now! Based on your usual driving pattern, you'll likely need a swap around 3:00 PM. I'll notify you when it's optimal.`,
      suggestedPrompts: ['Show my route plan', "How's my battery health?", 'Show savings'],
      actionable: { type: 'info' },
    };
  }

  // Pattern: Cheapest station / price
  if (message.includes('cheap') || message.includes('price') || message.includes('cost')) {
    return {
      reply: `The most affordable station near you is ${nearestStation} at ₦1,500 per swap. Mainland stations are generally 10-15% cheaper than Island locations. Your wallet balance is ₦${walletBalance.toLocaleString()}, enough for ${Math.floor(walletBalance / 1500)} swaps.`,
      suggestedPrompts: ['Navigate to cheapest', 'Compare all stations', 'Top up wallet'],
      actionable: { type: 'navigate', target: nearestStation },
    };
  }

  // Pattern: Battery health
  if (message.includes('battery') && (message.includes('health') || message.includes('condition'))) {
    return {
      reply: `Your current battery health score is 88/100 — that's good! You have approximately ${Math.round(batteryLevel * 0.6 * 0.88)} km of range remaining. The battery has completed 320 charge cycles out of an estimated 1,200 lifetime cycles. No maintenance needed at this time.`,
      suggestedPrompts: ['Show detailed report', 'When should I swap?', 'Show my savings'],
      actionable: { type: 'info' },
    };
  }

  // Pattern: Savings / money saved
  if (message.includes('saving') || message.includes('saved') || message.includes('money')) {
    return {
      reply: `Great news! You've saved ₦47,500 this month by using SwapSmart instead of petrol. That's a 62% reduction in fuel costs. Over the past 3 months, your total savings are ₦142,000. At this rate, you'll save over ₦500,000 this year!`,
      suggestedPrompts: ['Show monthly breakdown', 'Compare with petrol', 'Share my savings'],
      actionable: { type: 'info' },
    };
  }

  // Pattern: Station availability / nearby
  if (message.includes('station') || message.includes('nearby') || message.includes('available')) {
    return {
      reply: `I found 3 stations near you:\n\n1. ${nearestStation} — 4 batteries available, 1.2 km away (~3 min)\n2. Surulere Station — 2 batteries available, 2.8 km away (~7 min)\n3. Ikeja Hub — 6 batteries available, 4.1 km away (~12 min)\n\nWould you like to reserve at any of these?`,
      suggestedPrompts: ['Reserve at nearest', 'Show on map', 'Filter by price'],
      actionable: { type: 'navigate', target: nearestStation },
    };
  }

  // Pattern: Reservation / reserve
  if (message.includes('reserve') || message.includes('reservation') || message.includes('book')) {
    if (context?.activeReservation) {
      return {
        reply: `You already have an active reservation at ${nearestStation}. Your battery is being held for another 12 minutes. Would you like directions to the station?`,
        suggestedPrompts: ['Navigate to station', 'Cancel reservation', 'Extend hold time'],
        actionable: { type: 'navigate', target: nearestStation },
      };
    }
    return {
      reply: `I can help you reserve a battery! ${nearestStation} has 4 batteries available right now. A reservation holds a battery for 15 minutes. Shall I reserve one for you?`,
      suggestedPrompts: ['Yes, reserve now', 'Show other stations', 'When should I swap?'],
      actionable: { type: 'reserve', target: nearestStation },
    };
  }

  // Pattern: Help / what can you do
  if (message.includes('help') || message.includes('what can') || message.includes('how do')) {
    return {
      reply: `I'm your SwapSmart AI assistant! I can help you with:\n\n• Finding the best time to swap your battery\n• Locating nearby stations and checking availability\n• Reserving batteries at stations\n• Checking your battery health and range\n• Tracking your savings vs petrol costs\n• Answering questions about your account\n\nJust ask me anything!`,
      suggestedPrompts: SUGGESTED_PROMPTS,
      actionable: { type: 'info' },
    };
  }

  // Default fallback
  return {
    reply: `I understand you're asking about "${message.slice(0, 50)}". While I'm still learning, I can help you with swap timing, station availability, battery health, and savings tracking. Could you try rephrasing, or pick one of the suggestions below?`,
    suggestedPrompts: SUGGESTED_PROMPTS,
    actionable: { type: 'info' },
  };
}
