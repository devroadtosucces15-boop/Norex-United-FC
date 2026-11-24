const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36', Accept: 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9', Referer: 'https://www.ea.com/', Origin: 'https://www.ea.com' };
for (const [ep, q] of [['allTimeLeaderboard/search', 'clubName=Phoenix'], ['clubs/matches', 'clubIds=24610&matchType=leagueMatch&maxResultCount=2']]) {
  const r = await fetch(`https://proclubs.ea.com/api/fc/${ep}?platform=common-gen5&${q}`, { headers: H });
  const t = await r.text();
  console.log(ep, r.status, t.slice(0, 120).replace(/\s+/g, ' '));
}
