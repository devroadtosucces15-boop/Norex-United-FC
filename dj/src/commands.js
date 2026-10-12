import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { EFFECT_NAMES, EFFECTS } from './effects.js';

const fxChoice = (o) => o.setName('name').setDescription('Effect').setRequired(true).addChoices(...EFFECT_NAMES.map((n) => ({ name: `${EFFECTS[n].emoji} ${EFFECTS[n].label}`, value: n })));
export const DEFS = [
  new SlashCommandBuilder().setName('play').setDescription('Play a song or link (YouTube → Spotify → SoundCloud)')
    .addStringOption((o) => o.setName('song').setDescription('Song name or link').setRequired(true))
    .addStringOption((o) => o.setName('source').setDescription('Force a platform (default: YouTube, then Spotify, then SoundCloud)').addChoices({ name: 'YouTube', value: 'youtube' }, { name: 'Spotify', value: 'spotify' }, { name: 'SoundCloud', value: 'soundcloud' })),
  new SlashCommandBuilder().setName('setup').setDescription('Managers: make this text channel the player for a voice channel')
    .addChannelOption((o) => o.setName('voice').setDescription('Voice channel the music plays in').setRequired(true).addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)),
  new SlashCommandBuilder().setName('unsetup').setDescription('Managers: remove the player from this text channel'),
  new SlashCommandBuilder().setName('panel').setDescription('Re-post the player panel at the bottom of this channel'),
  new SlashCommandBuilder().setName('queue').setDescription('Show the queue'),
  new SlashCommandBuilder().setName('voteskip').setDescription('Vote to skip the current song'),
  new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
  new SlashCommandBuilder().setName('pause').setDescription('Pause or resume'),
  new SlashCommandBuilder().setName('stop').setDescription('Stop and leave'),
  new SlashCommandBuilder().setName('volume').setDescription('Set volume').addIntegerOption((o) => o.setName('percent').setDescription('1-150').setRequired(true).setMinValue(1).setMaxValue(150)),
  new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue'),
  new SlashCommandBuilder().setName('loop').setDescription('Loop mode').addStringOption((o) => o.setName('mode').setDescription('off, song or queue').setRequired(true).addChoices({ name: 'off', value: 'off' }, { name: 'song', value: 'track' }, { name: 'queue', value: 'queue' })),
  new SlashCommandBuilder().setName('remove').setDescription('Remove a queued song').addIntegerOption((o) => o.setName('position').setDescription('Position in queue').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('autoplay').setDescription('Keep playing suggested songs based on this session')
    .addBooleanOption((o) => o.setName('state').setDescription('On or off').setRequired(true)),
  new SlashCommandBuilder().setName('effects').setDescription('Audio effects: each can be on/off with its own level')
    .addSubcommand((s) => s.setName('toggle').setDescription('Turn an effect on or off').addStringOption(fxChoice).addBooleanOption((o) => o.setName('state').setDescription('On or off').setRequired(true)))
    .addSubcommand((s) => s.setName('level').setDescription('Set how strong an effect is (also turns it on)').addStringOption(fxChoice).addIntegerOption((o) => o.setName('amount').setDescription('1 (subtle) to 10 (extreme)').setRequired(true).setMinValue(1).setMaxValue(10)))
    .addSubcommand((s) => s.setName('list').setDescription('Show every effect and its state'))
    .addSubcommand((s) => s.setName('reset').setDescription('Turn all effects off'))
].map((c) => c.toJSON());
