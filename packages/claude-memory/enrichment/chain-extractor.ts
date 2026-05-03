export type ChainType = "decision" | "failure-pivot" | "synthesis";

export type DecisionChain = {
  type: ChainType;
  content: string;
  title: string;
};

type Message = {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
};

function getText(msg: Message): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!)
      .join("\n");
  }
  return "";
}

const SYNTHESIS_PATTERNS = [
  /\bthe (?:fix|issue|problem|root cause|solution) (?:is|was)\b/i,
  /\bturned out\b/i,
  /\bdiscovered (?:that|the)\b/i,
  /\bswitched to\b/i,
  /\bpivoted to\b/i,
  /\bneed to (?:always|never)\b/i,
  /\bfor compatibility\b/i,
];

const FAILURE_PATTERNS = [
  /\b(?:returned a |got a )?\d{3}\b/i,
  /\berror\b/i,
  /\bfailed\b/i,
  /\bdoesn't (?:exist|work)\b/i,
  /\b404\b/,
  /\b500\b/,
];

const DECISION_PATTERNS = [
  /\bwe should\b/i,
  /\balways use\b/i,
  /\bnever use\b/i,
  /\bprefer\b/i,
  /\blet's (?:go with|use|switch)\b/i,
  /\bpivot to\b/i,
  /\bok (?:use|switch|pivot)\b/i,
];

export function extractDecisionChains(messages: Message[]): DecisionChain[] {
  const chains: DecisionChain[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const text = getText(msg);
    if (!text || text.length < 20) continue;

    if (msg.role === "assistant" && FAILURE_PATTERNS.some((p) => p.test(text))) {
      const next = messages[i + 1];
      const nextText = next ? getText(next) : "";
      if (
        nextText &&
        (DECISION_PATTERNS.some((p) => p.test(nextText)) ||
          SYNTHESIS_PATTERNS.some((p) => p.test(nextText)))
      ) {
        const combined = `Tried: ${text.slice(0, 500)}\nResolution: ${nextText.slice(0, 500)}`;
        chains.push({
          type: "failure-pivot",
          content: combined.slice(0, 2000),
          title: `Pivot: ${nextText.slice(0, 60).replace(/\s+/g, " ").trim()}`,
        });
        i++;
        continue;
      }
    }

    if (msg.role === "user" && DECISION_PATTERNS.some((p) => p.test(text))) {
      const next = messages[i + 1];
      const nextText = next && next.role === "assistant" ? getText(next) : "";
      const combined = nextText
        ? `Decision: ${text.slice(0, 500)}\nOutcome: ${nextText.slice(0, 500)}`
        : `Decision: ${text.slice(0, 1000)}`;
      chains.push({
        type: "decision",
        content: combined.slice(0, 2000),
        title: `Decision: ${text.slice(0, 60).replace(/\s+/g, " ").trim()}`,
      });
      if (nextText) i++;
      continue;
    }

    if (msg.role === "assistant" && SYNTHESIS_PATTERNS.some((p) => p.test(text))) {
      chains.push({
        type: "synthesis",
        content: text.slice(0, 2000),
        title: `Discovery: ${text.slice(0, 60).replace(/\s+/g, " ").trim()}`,
      });
    }
  }

  return chains;
}
