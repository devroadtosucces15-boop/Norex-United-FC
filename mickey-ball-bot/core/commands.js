import { SlashCommandBuilder } from 'discord.js';

const lookup = (o) => o.setName('club').setDescription('Club name or EA club ID').setRequired(true);
const tracked = (o) => o.setName('club').setDescription('Tracked club (default: this server\'s club)').setAutocomplete(true);
const stat = (name, desc) => (o) => o.setName(name).setDescription(desc).setRequired(true).setAutocomplete(true);

export const commands = [
  new SlashCommandBuilder().setName('match').setDescription('Find clubs, post match stats, track clubs')
    .addSubcommand((s) => s.setName('search').setDescription('Find clubs by name (or see opponents from its latest matches)').addStringOption(lookup)
      .addBooleanOption((o) => o.setName('opponents').setDescription('List opponents from the latest matches instead')))
    .addSubcommand((s) => s.setName('stats').setDescription('Post a match with Box Score / Club Stats / Players buttons').addStringOption(lookup)
      .addIntegerOption((o) => o.setName('game').setDescription('1 = latest, 2 = the one before, …').setMinValue(1).setMaxValue(10)))
    .addSubcommand((s) => s.setName('track').setDescription('Track a club and auto-post its new matches here').addStringOption(lookup))
    .addSubcommand((s) => s.setName('untrack').setDescription('Stop tracking a club').addStringOption(tracked))
    .addSubcommand((s) => s.setName('list').setDescription('Clubs tracked in this server')),
  new SlashCommandBuilder().setName('club').setDescription('Club record, form and streak').addStringOption(tracked),
  new SlashCommandBuilder().setName('last').setDescription('The latest match with Box Score / Club Stats / Players').addStringOption(tracked),
  new SlashCommandBuilder().setName('results').setDescription('Recent results').addStringOption(tracked)
    .addIntegerOption((o) => o.setName('count').setDescription('How many (max 10)').setMinValue(1).setMaxValue(10)),
  new SlashCommandBuilder().setName('player').setDescription('A player\'s stats card').addStringOption(stat('gamertag', 'Start typing a gamertag')).addStringOption(tracked),
  new SlashCommandBuilder().setName('compare').setDescription('Compare two players')
    .addStringOption(stat('player1', 'First player')).addStringOption(stat('player2', 'Second player')).addStringOption(tracked),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Player leaderboards').addStringOption(tracked)
    .addStringOption((o) => o.setName('stat').setDescription('Which leaderboard').addChoices(
      { name: 'Rating', value: 'rating' }, { name: 'Goals', value: 'goals' }, { name: 'Assists', value: 'assists' },
      { name: 'Goals + assists', value: 'ga' }, { name: 'Man of the match', value: 'motm' }, { name: 'Games', value: 'games' })),
  new SlashCommandBuilder().setName('history').setDescription('Record against an opponent').addStringOption(stat('opponent', 'Opponent club name (or part of it)')).addStringOption(tracked),
  new SlashCommandBuilder().setName('insight').setDescription('Form, last 5 or streaks').addStringOption(tracked)
    .addStringOption((o) => o.setName('type').setDescription('Which insight').addChoices(
      { name: 'Club form', value: 'form' }, { name: 'Last 5 matches', value: 'last5' }, { name: 'Streaks', value: 'streaks' })),
  new SlashCommandBuilder().setName('help').setDescription('What this bot can do'),
].map((c) => c.toJSON());
