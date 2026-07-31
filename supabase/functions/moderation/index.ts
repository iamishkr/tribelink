// TribeLink — Content Moderation Edge Function
// Checks posts & messages for toxic content, spam, and inappropriate material

const TOXICITY_PATTERNS = [
  /\b(spam|scam|fraud)\b/gi,
  /\b(hate|kill|violence)\b/gi,
  /https?:\/\/[^\s]+(phishing|malware)/gi,
];

const SPAM_PATTERNS = [
  /(.)\1{5,}/g,           // Repeated characters
  /(https?:\/\/[^\s]+){3,}/g, // Multiple URLs
];

interface ModerationResult {
  is_safe: boolean;
  toxicity_score: number;
  spam_score: number;
  flags: string[];
}

function moderateContent(text: string): ModerationResult {
  const flags: string[] = [];
  let toxicityScore = 0;
  let spamScore = 0;

  // Check toxicity
  for (const pattern of TOXICITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      flags.push(`toxic:${matches[0]}`);
      toxicityScore += 30;
    }
  }

  // Check spam
  for (const pattern of SPAM_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      flags.push('spam');
      spamScore += 25;
    }
  }

  // Cap scores
  toxicityScore = Math.min(toxicityScore, 100);
  spamScore     = Math.min(spamScore, 100);

  return {
    is_safe:        toxicityScore < 50 && spamScore < 50,
    toxicity_score: toxicityScore,
    spam_score:     spamScore,
    flags,
  };
}

Deno.serve(async (req: Request) => {
  try {
    const { content, content_id, content_type } = await req.json();

    if (!content) {
      return Response.json({ error: 'content is required' }, { status: 400 });
    }

    const result = moderateContent(content);

    // If flagged, auto-flag in DB (using service role)
    if (!result.is_safe && content_id) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      if (content_type === 'post') {
        await supabase
          .from('posts')
          .update({ is_flagged: true })
          .eq('id', content_id);
      }
    }

    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});
