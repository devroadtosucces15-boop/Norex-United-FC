// Registers the bot's slash commands with Discord. Run by .github/workflows/bot.yml
// (needs DISCORD_APP_ID and DISCORD_BOT_TOKEN), so no PC is required.
const { DISCORD_APP_ID: app, DISCORD_BOT_TOKEN: token } = process.env;
if (!app || !token) {
  console.error('Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN');
  process.exit(1);
}

const SUB = 1, STRING = 3, INTEGER = 4, USER = 6;
const player = (name, description) => ({ type: STRING, name, description, required: true, autocomplete: true });
const commands = [
  { name: 'club', description: 'Club record, division and form' },
  { name: 'last', description: 'The latest result' },
  { name: 'results', description: 'Recent results', options: [{ type: INTEGER, name: 'count', description: 'How many (max 10)', min_value: 1, max_value: 10 }] },
  { name: 'player', description: "A player's stats card", options: [player('gamertag', 'Start typing a gamertag')] },
  { name: 'compare', description: 'Compare two players', options: [player('player1', 'First player'), player('player2', 'Second player')] },
  {
    name: 'top', description: 'Club leaderboards',
    options: [{ type: STRING, name: 'stat', description: 'Which leaderboard', choices: ['goals', 'assists', 'ga', 'rating', 'motm', 'games'].map((v) => ({ name: v === 'ga' ? 'goals + assists' : v, value: v })) }],
  },
  { name: 'site', description: 'Link to the club website' },
  // P7.4 – commands that read the member database (bot/botcmds.js)
  { name: 'schedule', description: 'Upcoming match nights – answer ✅ ❔ ❌ right here' },
  { name: 'availability', description: "Who's in for the next event and which positions are missing" },
  { name: 'lineup', description: 'The lineup for the next event' },
  {
    name: 'rush', description: 'Rush results',
    options: [{ type: SUB, name: 'log', description: 'Log a Rush result – a manager confirms it', options: [
      { type: STRING, name: 'opponent', description: 'Opponent club', required: true, max_length: 60 },
      { type: INTEGER, name: 'for', description: 'Our goals', required: true, min_value: 0, max_value: 40 },
      { type: INTEGER, name: 'against', description: 'Their goals', required: true, min_value: 0, max_value: 40 },
      { type: INTEGER, name: 'goals', description: 'Your goals', min_value: 0, max_value: 40 },
      { type: INTEGER, name: 'assists', description: 'Your assists', min_value: 0, max_value: 40 },
      { type: STRING, name: 'date', description: 'YYYY-MM-DD (default: today)', min_length: 10, max_length: 10 },
    ] }],
  },
  { name: 'me', description: 'My verified player card (only you see it)' },
  {
    name: 'leaderboard', description: 'League or Rush leaderboards',
    options: [
      { type: STRING, name: 'mode', description: 'League (EA) or Rush (logged)', choices: ['league', 'rush'].map((v) => ({ name: v === 'league' ? 'League' : 'Rush', value: v })) },
      { type: STRING, name: 'stat', description: 'Which leaderboard', choices: ['goals', 'assists', 'ga', 'rating', 'motm', 'games'].map((v) => ({ name: v === 'ga' ? 'goals + assists' : v, value: v })) },
    ],
  },
  { name: 'profile', description: "A member's profile – player, positions, platforms", options: [{ type: USER, name: 'member', description: 'Whose profile (default: yours)' }] },
  // P2.5 – only shown to people with Discord's Manage Roles permission (server owner can widen it in Server Settings → Integrations).
  { name: 'syncroles', description: 'Managers: give/remove the ✅ Verified role for every player claim', default_member_permissions: String(1 << 28), contexts: [0] },
];

const res = await fetch(`https://discord.com/api/v10/applications/${app}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
});
console.log(res.status, res.ok ? `Registered ${commands.length} commands` : await res.text());
if (!res.ok) process.exit(1);
