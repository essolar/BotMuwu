import Discord from 'discord.js';
import { BOSS_DATA_DIRECTORY, BOT_NAME, DEFAULT_COMMAND_PREFIX, events } from './globals/constants.js';
import * as commandManager from './util/commandManager.js';
import {
  convertToTimestamp,
  convertUnixTimeToCalendarFormat,
  getCurrentTime,
  getCurrentTimeInHMAFormat,
  readFile,
  writeFile,
} from './util/common.js';

const discordClient = new Discord.Client();
let reminderChannels = [];
const bossList = readFile(BOSS_DATA_DIRECTORY);
const onReady = () => {
  commandManager.loadCommands(discordClient).then(onLoad);
};

const onLoad = () => {
  console.log(`${BOT_NAME} esta Online!`);
  checkMvpRespawnTimers();
};

const checkMvpRespawnTimers = () => {
  setInterval(() => {
    let currentTime = convertToTimestamp(getCurrentTime());
    for (let i = 0; i < bossList.bosses.length; i++) {
      if (bossList.bosses[i].deathTime && currentTime >= bossList.bosses[i].minRespawnTime) {
        const remindEmbed = new Discord.MessageEmbed()
          .setColor('#0x43a047')
          .setTitle(`${bossList.bosses[i].bossName} respawn schedule is now **UP!** `)
          .setThumbnail(bossList.bosses[i].imageUrl)
          .addFields(
            {
              name: 'Min. Respawn',
              value: convertUnixTimeToCalendarFormat(bossList.bosses[i].minRespawnTime) || '--',
              inline: true,
            },
            {
              name: 'Max. Respawn',
              value: convertUnixTimeToCalendarFormat(bossList.bosses[i].maxRespawnTime) || '--',
              inline: true,
            },
          )
          .setFooter(
            `Current Time: ${getCurrentTimeInHMAFormat()}`,
            '⏰',
          );
        reminderChannels.forEach((channel) => {
          channel.send(remindEmbed);
        });
        bossList.bosses[i].deathTime = null;
        bossList.bosses[i].minRespawnTime = null;
        bossList.bosses[i].maxRespawnTime = null;
      }
    }
  }, 1000);

  setInterval(function () {
    writeFile(BOSS_DATA_DIRECTORY, bossList);
  }, 30000);
};

const onMessageReceived = (message) => {
  if (!message.content.startsWith(DEFAULT_COMMAND_PREFIX) || message.author.bot) return;

  const args = message.content.slice(DEFAULT_COMMAND_PREFIX.length).split(/ +/);
  const command = args.shift().toLowerCase();

  if (command == 'mvp') {
    discordClient.commands.get('mvp').execute(message, args, bossList);
  } else if (command == 'help') {
    discordClient.commands.get('help').execute(message, args);
  } else if (command == 'info') {
    discordClient.commands.get('info').execute(message, args, bossList);
  } else if (command == 'set-reminder-channel') {
    if (reminderChannels.filter((channel) => channel.id === message.channel.id).length > 0) {
      message.channel.send('[Fallo] ya se envían recordatorios por este canal');
    } else {
      reminderChannels.push(message.channel);
      message.channel.send('[Completado] los recordatorios se envían ahora por este canal');
    }
  } else {
    message.channel.send(
      '**Commando no existe **! Porfavor usa `$help` para ver la lista de comandos.',
    );
  }
};

discordClient.once(events.READY, onReady);
discordClient.on(events.MESSAGE, onMessageReceived);
discordClient.login(`${process.env.TOKEN}`);
