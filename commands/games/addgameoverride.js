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
    run(message, {gamename}) {
        message.client.postgresClient.query('INSERT INTO gamesplayed(userid, gamename) VALUES ($1,$2) ON CONFLICT DO NOTHING', [message.author.id.toString(), gamename.toLowerCase().trim()])
            .then(() => {
                message.reply(`Added ${gamename} to the database.`)
            })
            .catch(err => {
                console.error(err.stack);
            });
    }
};