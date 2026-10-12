import { SlashCommandBuilder } from 'discord.js';
import { FILTER_NAMES } from './filters.js';

const str = (n, d, req = true) => (o) => o.setName(n).setDescription(d).setRequired(req);
export const DEFS = [
  new SlashCommandBuilder().setName('play').setDescription('Play a song or link (SoundCloud, YouTube, Spotify)').addStringOption(str('song', 'Song name or link')),
  new SlashCommandBuilder().setName('queue').setDescription('Show the queue'),
  new SlashCommandBuilder().setName('nowplaying').setDescription('Show what is playing'),
  new SlashCommandBuilder().setName('voteskip').setDescription('Vote to skip the current song'),
  new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
  new SlashCommandBuilder().setName('pause').setDescription('Pause or resume'),
  new SlashCommandBuilder().setName('stop').setDescription('Stop and leave'),
  new SlashCommandBuilder().setName('volume').setDescription('Set volume').addIntegerOption((o) => o.setName('percent').setDescription('1-150').setRequired(true).setMinValue(1).setMaxValue(150)),
  new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue'),
  new SlashCommandBuilder().setName('loop').setDescription('Loop mode').addStringOption((o) => o.setName('mode').setDescription('off, track or queue').setRequired(true).addChoices({ name: 'off', value: 'off' }, { name: 'track', value: 'track' }, { name: 'queue', value: 'queue' })),
  new SlashCommandBuilder().setName('remove').setDescription('Remove a queued song').addIntegerOption((o) => o.setName('position').setDescription('Position in queue').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('filter').setDescription('Audio filter (8D, bass boost, nightcore, ...)').addStringOption((o) => o.setName('name').setDescription('Filter').setRequired(true).addChoices(...FILTER_NAMES.map((n) => ({ name: n, value: n }))))
].map((c) => c.toJSON());
