const {Command} = require('discord.js-commando');
const TitleCase = require('title-case');
const titleCase = TitleCase.titleCase;

module.exports = class GamesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'add-game-override',
            aliases: ['addgameoverride', 'ago'],
            group: 'games',
            memberName: 'add-game-override',
            hidden: true,
            description: 'Adds a game to a user, incase they don\'t have game activity enabled or similar.',
            throttling: {
                usages: 4,
                duration: 5
            },
            guildOnly: false,
            clientPermissions: ['SEND_MESSAGES'],
            args: [
                {
                    key: 'gamename',
                    prompt: 'What game would you like to add?',
                    type: 'string'
                }
            ]
        });
    }

    // noinspection JSCheckFunctionSignatures
    async run(message, {gamename}) {
        let status;
        if (message.guild === null || message.guild === undefined) {
            status = true;
        } else {
            status = (await message.client.getServerConfig(message.guild))['gamesservices'];
        }
        let lng = (await message.client.getServerConfig(message.guild))['language'];
        if (lng === undefined) {
            lng = "en"
        }
        if (!status) {
            return message.say(message.client.i18next.t("gamesServicesDisabled", {"lng": lng}))
        } else {
            message.client.postgresClient.query('INSERT INTO gamesplayed(userid, gamename) VALUES ($1,$2) ON CONFLICT DO NOTHING', [message.author.id.toString(), gamename.toLowerCase().trim()])
                .then(() => {
                    message.reply(`Added ${gamename} to the database.`)
                })
                .catch(err => {
                    console.error(err.stack);
                });
        }
    }
};