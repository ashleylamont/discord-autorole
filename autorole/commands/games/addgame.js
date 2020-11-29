const {Command} = require('discord.js-commando');
const TitleCase = require('title-case');
const titleCase = TitleCase.titleCase;

module.exports = class GamesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'add-game',
            aliases: ['add-games', 'ag', 'addgame'],
            group: 'games',
            memberName: 'add-game',
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
            message.client.postgresClient.query('SELECT COUNT(*) FROM gamesplayed WHERE gamename = $1', [gamename.toLowerCase().trim()])
                .then(res => {
                    if (res.rows[0].count < 10) {
                        message.reply(`I found very few existing records for "${gamename}", checking for possible typos now.`);
                        message.say(`If you are sure that you wanted to add "${gamename}", then use the command \`@AutoRole add-game-override ${gamename}\` to override this check.`);
                        // noinspection SqlResolve
                        message.client.postgresClient.query('SELECT * FROM (SELECT gamename, SIMILARITY(gamename, $1) FROM gamefrequency WHERE count > 20) AS gamesimilarity WHERE similarity > 0.3 ORDER BY similarity', [gamename.toLowerCase().trim()])
                            .then(res => {
                                if (res.rowCount > 0) {
                                    let suggestions = [];
                                    res.rows.forEach(val => {
                                        suggestions.push(val.gamename)
                                    });
                                    message.say(`Did you mean: ${suggestions.map(val => {
                                        return `"${val}"`
                                    }).join(', ')}`)
                                }
                            }).catch(err => {
                            message.client.log(err);
                            return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
                        });
                    } else {
                        message.client.postgresClient.query('INSERT INTO gamesplayed(userid, gamename) VALUES ($1,$2) ON CONFLICT DO NOTHING', [message.author.id.toString(), gamename.toLowerCase().trim()])
                            .then(() => {
                                message.reply(`Added ${gamename} to the database.`)
                            })
                            .catch(err => {
                                console.error(err.stack);
                            });
                    }
                })
                .catch(err => {
                    console.error(err.stack);
                });
        }
    }
};