"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VoiceProvider, useVoice } from "@humeai/voice-react";

interface VoiceInputProps {
  onMessage: (text: string, role?: "user" | "assistant") => void;
  userName?: string | null;
}

// Session storage keys for anti-re-greeting
const SESSION_GREETED_KEY = 'hume_greeted_session';
const SESSION_LAST_INTERACTION_KEY = 'hume_last_interaction';

function getSessionValue(key: string, defaultValue: number | boolean): number | boolean {
  if (typeof window === 'undefined') return defaultValue;
  const stored = sessionStorage.getItem(key);
  if (stored === null) return defaultValue;
  return key.includes('time') ? parseInt(stored, 10) : stored === 'true';
}

function setSessionValue(key: string, value: number | boolean): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(key, String(value));
}

// Inner component using voice hook
function VoiceButton({ onMessage, userName }: VoiceInputProps) {
  const { connect, disconnect, status, messages, error, sendUserInput } = useVoice();
  const [isPending, setIsPending] = useState(false);
  const lastSentMsgId = useRef<string | null>(null);

  const greetedThisSession = useRef(getSessionValue(SESSION_GREETED_KEY, false) as boolean);
  const lastInteractionTime = useRef(getSessionValue(SESSION_LAST_INTERACTION_KEY, 0) as number);

  // Debug logging
  useEffect(() => {
    console.log("🔊 Voice status:", status.value, error);
  }, [status, error]);

  // Forward messages to parent
  useEffect(() => {
    const conversationMsgs = messages.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => (m.type === "user_message" || m.type === "assistant_message") && m.message?.content
    );

    if (conversationMsgs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastMsg = conversationMsgs[conversationMsgs.length - 1] as any;
      const msgId = lastMsg?.id || `${conversationMsgs.length}-${lastMsg?.message?.content?.slice(0, 20)}`;

      if (lastMsg?.message?.content && msgId !== lastSentMsgId.current) {
        const isUser = lastMsg.type === "user_message";
        console.log(`🎤 Forwarding ${isUser ? 'user' : 'assistant'}:`, lastMsg.message.content.slice(0, 50));
        lastSentMsgId.current = msgId;
        onMessage(lastMsg.message.content, isUser ? "user" : "assistant");
      }
    }
  }, [messages, onMessage]);

  const handleToggle = useCallback(async () => {
    if (status.value === "connected") {
      const now = Date.now();
      lastInteractionTime.current = now;
      setSessionValue(SESSION_LAST_INTERACTION_KEY, now);
      disconnect();
    } else {
      setIsPending(true);
      try {
        console.log("🎤 Fetching Hume token...");
        const res = await fetch("/api/hume-token");
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || data.details || "Failed to get Hume token");
        }

        const { accessToken } = data;
        if (!accessToken) {
          throw new Error("No access token returned");
        }
        console.log("🎤 Got access token");

        // Detect quick reconnect
        const timeSinceLastInteraction = lastInteractionTime.current > 0
          ? Date.now() - lastInteractionTime.current
          : Infinity;
        const isQuickReconnect = timeSinceLastInteraction < 5 * 60 * 1000;
        const wasGreeted = greetedThisSession.current;

        // Build greeting instruction
        let greetingInstruction = "";
        if (wasGreeted || isQuickReconnect) {
          greetingInstruction = `DO NOT GREET - user was already greeted. Continue conversation naturally.`;
        } else {
          greetingInstruction = userName
            ? `First connection. Say "Hi ${userName}!" once, then never re-greet.`
            : `First connection. Give a brief warm greeting, then never re-greet.`;
        }

        const systemPrompt = `## YOUR ROLE
You are a friendly UK stamp duty calculator assistant with voice capabilities.
Help users understand how much stamp duty they'll pay when buying property.

## USER
${userName ? `Name: ${userName}` : 'Guest user'}

## GREETING
${greetingInstruction}

## KEY KNOWLEDGE
- England & Northern Ireland: SDLT (Stamp Duty Land Tax)
- Scotland: LBTT (Land and Buildings Transaction Tax)
- Wales: LTT (Land Transaction Tax)

## HOW TO HELP
1. Ask about property purchase price
2. Confirm location (England, Scotland, or Wales)
3. Ask if first-time buyer
4. Ask if additional property (second home/buy-to-let)
5. Calculate and explain the duty clearly

## NOTES
- First-time relief in England only up to £625,000
- Wales has NO first-time buyer relief
- Additional properties: +5% England, +6% Scotland, +4% Wales

Keep responses SHORT for voice - 1-2 sentences unless details needed.`;

        const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID || "6b8b3912-ce29-45c6-ab6a-0902d7278a68";
        console.log("🎤 Connecting with configId:", configId);

        await connect({
          auth: { type: "accessToken", value: accessToken },
          configId: configId,
          sessionSettings: {
            type: "session_settings",
            systemPrompt: systemPrompt,
          }
        });
        console.log("🎤 Connected");

        // Mark as greeted and trigger initial greeting
        if (!wasGreeted && !isQuickReconnect && userName) {
          setTimeout(() => {
            greetedThisSession.current = true;
            setSessionValue(SESSION_GREETED_KEY, true);
            sendUserInput(`Hello, my name is ${userName}`);
          }, 500);
        } else {
          greetedThisSession.current = true;
          setSessionValue(SESSION_GREETED_KEY, true);
        }
      } catch (e) {
        console.error("🔴 Voice connect error:", e);
      } finally {
        setIsPending(false);
      }
    }
  }, [connect, disconnect, status.value, userName, sendUserInput]);

  const isConnected = status.value === "connected";

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
        isConnected
          ? "bg-red-500 hover:bg-red-600 animate-pulse"
          : isPending
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700"
      }`}
      title={isConnected ? "Stop listening" : "Start voice input"}
      aria-label={isConnected ? "Stop listening" : "Start voice input"}
    >
      {isPending ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isConnected ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10h6v4H9z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          )}
        </svg>
      )}
    </button>
  );
}

// Stable callbacks to prevent VoiceProvider remounting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleVoiceError = (err: any) => console.error("🔴 Hume Error:", err?.message || err);
const handleVoiceOpen = () => console.log("🟢 Hume WebSocket connected");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleVoiceClose = (e: any) => console.log("🟡 Hume closed:", e?.code, e?.reason);

// Exported component with VoiceProvider - memoized to prevent remounting
export function VoiceInput({ onMessage, userName }: VoiceInputProps) {
  // Memoize the button to prevent unnecessary re-renders
  const voiceButton = useCallback(() => (
    <VoiceButton onMessage={onMessage} userName={userName} />
  ), [onMessage, userName]);

  return (
    <VoiceProvider
      onError={handleVoiceError}
      onOpen={handleVoiceOpen}
      onClose={handleVoiceClose}
    >
      {voiceButton()}
    </VoiceProvider>
  );
}
