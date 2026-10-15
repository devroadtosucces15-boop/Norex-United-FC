// P11.11 – `/ask` club chatbot: answers natural-language questions about the club using the site's own JSON
// stats as context for the Workers AI text model confirmed working in P11.1 – no new data pipeline, a
// free-form version of /top and /compare.
const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';

// A compact, factual brief the model is told to answer only from – keeps it grounded in real numbers instead
// of guessing, and small enough to stay well inside the model's context window.
export function buildAskContext(club, players) {
  const squad = (players ?? []).filter((p) => p.home && p.s && p.src === 'club');
  const top = (label, f, dec = 0) => {
    const list = squad.map((p) => [p, f(p)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return list.length ? `${label}: ${list.map(([p, v]) => `${p.n} (${v.toFixed(dec)})`).join(', ')}.` : null;
  };
  const gd = (club.gf ?? 0) - (club.ga ?? 0);
  const m = club.matches?.[0];
  const last = m && `Latest result: ${m.res === 'W' ? 'Win' : m.res === 'L' ? 'Loss' : 'Draw'} ${m.gf}-${m.ga} vs ${m.opp}${m.scorers?.length ? `, scorers: ${m.scorers.map((s) => s.n).join(', ')}` : ''}${m.motm ? `, MOTM: ${m.motm}` : ''}.`;
  return [
    `Club: ${club.name}. Division ${club.division ?? 'unknown'}, skill rating ${club.skill ?? 'unknown'}.`,
    `Record: ${club.w}W ${club.d}D ${club.l}L (${club.gp} played), ${club.gf} scored, ${club.ga} conceded (${gd >= 0 ? '+' : ''}${gd}).`,
    last,
    top('Top scorers', (p) => p.s.g),
    top('Most assists', (p) => p.s.a),
    top('Best average rating (3+ games)', (p) => (p.s.gp >= 3 ? p.s.r : 0), 1),
    top('Most MOTM awards', (p) => p.s.m),
    top('Most appearances', (p) => p.s.gp),
  ].filter(Boolean).join('\n');
}

// Falls back to null (never throws past this) – the caller shows a friendly "couldn't answer" message.
export async function askAnswer(env, question, context) {
  const prompt = [
    'You are a friendly Discord assistant for a football (soccer) club. Answer the question using ONLY the club data below.',
    "If the data doesn't cover it, say you don't have that information – never invent stats or guess names.",
    'Keep the answer to 2-4 short sentences, plain text, no markdown, no more than one emoji.',
    '',
    context,
  ].join('\n');
  const out = await env.AI.run(TEXT_MODEL, {
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: String(question).slice(0, 300) }],
    max_tokens: 220,
  });
  const text = typeof out?.response === 'string' ? out.response.trim() : '';
  return text ? text.slice(0, 1800) : null; // Discord message content cap is 2000
}
