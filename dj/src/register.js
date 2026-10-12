import { REST, Routes } from 'discord.js';
import { DEFS } from './commands.js';
const { MAIN_TOKEN, MAIN_APP_ID, GUILD_ID } = process.env;
const rest = new REST().setToken(MAIN_TOKEN);
await rest.put(Routes.applicationGuildCommands(MAIN_APP_ID, GUILD_ID), { body: DEFS });
console.log(`Registered ${DEFS.length} commands`);
