// The bot's slash command definitions – one list shared by bot/register.mjs (deploy-time registration, a plain Node script)
// and the Worker (the Boardroom's "Sync to Discord" button, bot/botcommands.js). Keep them here, not in either of those.
const SUB = 1, STRING = 3, INTEGER = 4, BOOLEAN = 5, USER = 6, CHANNEL = 7, ROLE = 8, ATTACHMENT = 11;
const player = (name, description) => ({ type: STRING, name, description, required: true, autocomplete: true });
export const COMMANDS = [
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
  {
    name: 'ask', description: 'Ask the club chatbot a question about our stats (P11.11)',
    options: [{ type: STRING, name: 'question', description: 'e.g. who has the most assists this season?', required: true, max_length: 300 }],
  },
  {
    name: 'insight', description: "The club's latest stat insight (✨ BE9)",
    options: [{ type: STRING, name: 'stat', description: 'Which insight (default: club form)', choices: [
      { name: 'Club form', value: 'club' }, { name: 'Latest match', value: 'match' }, { name: 'Last 5 matches', value: 'last5' }, { name: 'Goals leaders', value: 'goals' },
      { name: 'Assists leaders', value: 'assists' }, { name: 'Rating leaders', value: 'rating' }, { name: 'MOTM leaders', value: 'motm' },
    ] }, { type: STRING, name: 'opponent', description: 'Head to head vs a club we have played', autocomplete: true }],
  },
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
  { name: 'awards', description: "This week's award ballot and last week's winners" },
  { name: 'points', description: 'Your total points + breakdown by category (P11.3)' },
  {
    name: 'avatarcard', description: 'Upload your avatar for an AI-styled club background (P11.5)',
    options: [{ type: ATTACHMENT, name: 'image', description: 'Your avatar image (PNG/JPG/WEBP, 8 MB max)', required: true }],
  },
  // P2.5 – only shown to people with Discord's Manage Roles permission (server owner can widen it in Server Settings → Integrations).
  // Club Intelligence – same visibility as /syncroles; the Worker still checks the manager role + `insights` flag.
  { name: 'insights', description: 'Managers: Club Intelligence – server + club analysis with recommendations', default_member_permissions: String(1 << 28), contexts: [0] },
  {
    name: 'burner', description: 'Managers: track burner clubs – search EA, pick one, get stats after every game',
    default_member_permissions: String(1 << 28), contexts: [0],
    options: [
      { type: SUB, name: 'recent', description: 'Pick a burner from the clubs our players are also in – no typing' },
      { type: SUB, name: 'search', description: 'Search EA for a club by name or club ID (leave empty for clubs NOREX played lately)', options: [{ type: STRING, name: 'club', description: 'Club name (or part of it) or club ID', required: false, min_length: 2, max_length: 40 }] },
      { type: SUB, name: 'track', description: 'Track a club right away by exact name or club ID', options: [{ type: STRING, name: 'club', description: 'Exact club name or club ID', required: true, min_length: 2, max_length: 40 }] },
      { type: SUB, name: 'list', description: 'The burner clubs being tracked, with their record' },
      { type: SUB, name: 'remove', description: 'Stop tracking a burner club' },
    ],
  },
  { name: 'syncroles', description: 'Managers: give/remove the ✅ Verified role for every player claim', default_member_permissions: String(1 << 28), contexts: [0] },
  {
    name: 'exportcontent', description: 'Owner: incremental channel history export to DMs',
    default_member_permissions: String(1 << 28), contexts: [0],
    options: [
      { type: CHANNEL, name: 'channel', description: 'Default: current channel' },
      { type: INTEGER, name: 'count', description: 'Messages to scan (max 250)', min_value: 1, max_value: 250 },
      { type: STRING, name: 'mode', description: 'Next older batch or reset', choices: [{name:'Next',value:'next'},{name:'Reset',value:'reset'}] },
      { type: STRING, name: 'type', description: 'Content type', choices: ['all','text','images','videos','audio','documents','attachments'].map(v=>({name:v,value:v})) },
      { type: STRING, name: 'extension', description: 'File extension e.g. pdf', max_length: 12 },
      { type: STRING, name: 'keyword', description: 'Filename keyword', max_length: 80 },
    ],
  },
  { name: 'aispike', description: 'Owner: one-off test of the Workers AI image + text models (P11.1)', default_member_permissions: String(1 << 28), contexts: [0] },
  {
    name: 'profanitysetup', description: 'Owner: create/update the AutoMod profanity rule + alert channel (P11.4)',
    default_member_permissions: String(1 << 28), contexts: [0],
    options: [{ type: CHANNEL, name: 'channel', description: 'Where AutoMod should send violation alerts', required: true }],
  },
  // P11.16 – quick wrappers around features that already exist in the Squad Hub
  { name: 'nextevent', description: 'The single next match night – answer ✅ ❔ ❌ right here' },
  {
    name: 'feedback', description: 'Send praise, a tip or a concern to a verified teammate (they never see who sent it)',
    options: [
      { type: USER, name: 'to', description: 'A verified teammate', required: true },
      { type: STRING, name: 'kind', description: 'What kind of message', required: true, choices: [['praise', 'Praise'], ['tip', 'Tip'], ['concern', 'Concern']].map(([value, name]) => ({ name, value })) },
      { type: STRING, name: 'text', description: 'Your message (10+ characters, kept clean)', required: true, min_length: 10, max_length: 500 },
    ],
  },
  {
    name: 'suggest', description: 'Drop an idea in the suggestion box',
    options: [
      { type: STRING, name: 'title', description: 'Short title for the idea', required: true, min_length: 4, max_length: 100 },
      { type: STRING, name: 'body', description: 'More detail (optional)', max_length: 1000 },
      { type: BOOLEAN, name: 'anon', description: "Hide your name from other members (managers still see it)" },
    ],
  },
  {
    name: 'announce', description: 'Managers: send an announcement to every member (Squad Hub bell + Discord DM)',
    default_member_permissions: String(1 << 28), contexts: [0],
    options: [
      { type: STRING, name: 'title', description: 'Announcement title', required: true, min_length: 3, max_length: 200 },
      { type: STRING, name: 'text', description: 'The message', max_length: 1000 },
      { type: BOOLEAN, name: 'ack', description: 'Require everyone to acknowledge it' },
      { type: STRING, name: 'audience', description: 'Who gets it (default: everyone)', choices: ['all', 'managers'].map((v) => ({ name: v === 'all' ? 'Everyone' : 'Managers only', value: v })) },
    ],
  },
  {
    name: 'trial', description: 'Managers: current trial cards, or search by gamertag',
    default_member_permissions: String(1 << 28), contexts: [0],
    options: [{ type: STRING, name: 'gamertag', description: 'Only cards matching this gamertag' }],
  },
  { name: 'motm', description: 'Current Man of the Match vote standing for the latest match' },
  { name: 'history', description: 'Our record against a past opponent', options: [{ type: STRING, name: 'opponent', description: "Opponent club name (or part of it)", required: true }] },
  // Server tools – the Miona / Carl-bot replacements (bot/servertools.js)
  {
    name: 'setup', description: 'Managers: leave/join alerts, welcome posts and the ping-role panel',
    default_member_permissions: String(1 << 28), contexts: [0],
    options: [
      { type: SUB, name: 'leavelog', description: 'Post leave and join alerts in a channel', options: [{ type: CHANNEL, name: 'channel', description: 'Managers-only channel for the alerts', required: true, channel_types: [0, 5] }] },
      { type: SUB, name: 'welcome', description: 'Welcome new members in a channel', options: [
        { type: CHANNEL, name: 'channel', description: 'Where to welcome them', required: true, channel_types: [0, 5] },
        { type: STRING, name: 'message', description: 'First line – {user} pings them, {name} is their name. Default: "Welcome to the crew, {user}! 👋"', max_length: 300 },
      ] },
      { type: SUB, name: 'pingroles', description: 'Post the 🔔 ping-role buttons (creates the roles if needed)', options: [{ type: CHANNEL, name: 'channel', description: 'Where to post the panel', required: true, channel_types: [0, 5] }] },
      { type: SUB, name: 'off', description: 'Switch leave/join alerts or welcome posts off', options: [{ type: STRING, name: 'feature', description: 'Which one', required: true, choices: [{ name: 'Leave/join alerts', value: 'leavelog' }, { name: 'Welcome posts', value: 'welcome' }] }] },
    ],
  },
  {
    name: 'purge', description: 'Managers: delete recent messages in this channel',
    default_member_permissions: String(1 << 28), contexts: [0],
    options: [
      { type: INTEGER, name: 'count', description: 'How many (1–100)', required: true, min_value: 1, max_value: 100 },
      { type: USER, name: 'member', description: 'Only messages from this member' },
    ],
  },
  {
    name: 'tag', description: 'Post a saved answer (rules, trial info…)', contexts: [0],
    options: [
      { type: STRING, name: 'name', description: 'Which tag', required: true, autocomplete: true, max_length: 32 },
      { type: USER, name: 'member', description: 'Ping someone with it' },
    ],
  },
  {
    name: 'tags', description: 'List saved answers – managers add and delete them here', contexts: [0],
    options: [
      { type: SUB, name: 'list', description: 'Every saved tag' },
      { type: SUB, name: 'set', description: 'Managers: add or replace a tag', options: [
        { type: STRING, name: 'name', description: 'Short name, e.g. rules or trial-info', required: true, max_length: 32 },
        { type: STRING, name: 'text', description: 'What it says – type \\n for a new line', required: true, max_length: 4000 },
      ] },
      { type: SUB, name: 'delete', description: 'Managers: delete a tag', options: [{ type: STRING, name: 'name', description: 'Which tag', required: true, autocomplete: true, max_length: 32 }] },
    ],
  },
  {
    name: 'remind', description: 'Set a reminder – e.g. in: 2h, text: join league', contexts: [0],
    options: [
      { type: STRING, name: 'in', description: 'When – 10m, 2h, 1h30m, 1d', required: true, max_length: 40 },
      { type: STRING, name: 'text', description: 'What to remind about', required: true, max_length: 1000 },
      { type: CHANNEL, name: 'channel', description: 'Managers: post it in another channel', channel_types: [0, 5] },
      { type: ROLE, name: 'role', description: 'Managers: ping a role with it' },
    ],
  },
  { name: 'reminders', description: 'Your waiting reminders – cancel any of them', contexts: [0] },
  // /host – schedule + post a session or friendly in one go (bot/host.js); times show in everyone's own zone
  {
    name: 'host', description: 'Managers: schedule a League or Rush session or friendly – posted with sign-up buttons',
    default_member_permissions: String(1 << 28), contexts: [0],
    options: [
      { type: STRING, name: 'mode', description: 'League or Rush', required: true, choices: [{ value: 'league', name: '🏆 League' }, { value: 'rush', name: '⚡ Rush' }] },
      { type: STRING, name: 'kind', description: 'A session for us, or a friendly against another club', required: true, choices: [{ value: 'session', name: 'Session' }, { value: 'friendly', name: 'Friendly' }] },
      { type: STRING, name: 'when', description: 'tonight 9pm · tomorrow 20:30 · fri 8:30pm · oct 14 9pm · in 2h', required: true, max_length: 40 },
      { type: STRING, name: 'timezone', description: 'Your time zone (default: the one in your Squad Hub profile)', autocomplete: true, max_length: 64 },
      { type: INTEGER, name: 'players', description: 'Players needed (default 11 League, 5 Rush)', min_value: 1, max_value: 30 },
      { type: INTEGER, name: 'length', description: 'How long, in minutes (default 120 League, 90 Rush)', min_value: 15, max_value: 600 },
      { type: STRING, name: 'opponent', description: 'Friendly: the club we play', max_length: 60 },
      { type: STRING, name: 'notes', description: 'Lobby info, kit, anything else', max_length: 500 },
      { type: BOOLEAN, name: 'weekly', description: 'Repeat every week for 4 weeks' },
      { type: CHANNEL, name: 'channel', description: 'Where to post it (default: here)', channel_types: [0, 5] },
      { type: ROLE, name: 'ping', description: 'Role to ping (default: the Match night / Rush LFG ping role)' },
      { type: BOOLEAN, name: 'silent', description: 'Post without pinging anyone' },
    ],
  },
];

// ---------- per-command settings → what Discord is told ----------
// Who may use a command, as the owner sets it in Boardroom → Bot: guest (anyone in the server) · member · claimed (approved player
// claim) · manager · owner. Discord itself can only hide a command from people without a permission, so manager/owner commands
// get the manager bit (they vanish from members' menus); everything finer is enforced by the Worker when the command is used.
export const MIN_ROLES = ['guest', 'member', 'claimed', 'manager', 'owner'];
const MANAGER_BIT = String(1 << 28);
export const isStaffOnly = (c) => !!c.default_member_permissions;
export function buildRegistration(list, settings = {}) {
  return list
    .filter((c) => settings[c.name]?.enabled !== false)
    .map((c) => {
      const min = settings[c.name]?.min;
      if (!min || min === 'guest' || min === 'member' || min === 'claimed') return c;
      return { ...c, default_member_permissions: MANAGER_BIT, contexts: [0] };
    });
}
