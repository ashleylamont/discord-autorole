const {Command} = require('discord.js-commando');

module.exports = class GamesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'common-games',
            aliases: ['get-common', 'find-common', 'common', 'cg', 'commongames'],
            group: 'games',
            memberName: 'common-games',
            description: 'Fetches all of the games that you and a mentioned user share.',
            throttling: {
                usages: 2,
                duration: 10
            },
            guildOnly: true,
            clientPermissions: ['SEND_MESSAGES'],
            args: [
                {
                    key: 'user',
                    prompt: 'What user would you like to search?',
                    type: 'user'
                }
            ]
        });
    }

    // noinspection JSCheckFunctionSignatures
    async run(message, {user}) {
        let status = (await message.client.getServerConfig(message.guild))["gamesservices"];
        let lng = (await message.client.getServerConfig(message.guild))['language'];
        if (lng === undefined) {
            lng = "en"
        }
        if (!status) {
            return message.say(message.client.i18next.t("gamesServicesDisabled", {"lng": lng}))
        } else {
            if (message.author === user) {
                return message.reply("You can't search yourself.")
            } else if (user.bot) {
                return message.reply("You can't search a bot.")
            } else {
                message.client.postgresClient.query('SELECT gamename, count(*) from gamesplayed WHERE userid = $1 OR userid = $2 GROUP BY gamename HAVING COUNT(*) > 1;', [message.author.id, user.id])
                    .then(res => {
                        if (res.rowCount > 0) {
                            let rows = res.rows.map(row => {
                                return `"${row.gamename}"`
                            });
                            return message.say("You both play: " + rows.join(", "))
                        } else {
                            return message.say("Either you two don't share any games, or I haven't spotted you playing them before.")
                        }
                    })
            }
        }
    }
};