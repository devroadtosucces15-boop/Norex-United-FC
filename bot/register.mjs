// Registers the bot's slash commands with Discord. Run by .github/workflows/bot.yml
// (needs DISCORD_APP_ID and DISCORD_BOT_TOKEN), so no PC is required.
const { DISCORD_APP_ID: app, DISCORD_BOT_TOKEN: token } = process.env;
if (!app || !token) {
  console.error('Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN');
  process.exit(1);
}

const STRING = 3, INTEGER = 4;
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
];

const res = await fetch(`https://discord.com/api/v10/applications/${app}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
});
console.log(res.status, res.ok ? `Registered ${commands.length} commands` : await res.text());
if (!res.ok) process.exit(1);
