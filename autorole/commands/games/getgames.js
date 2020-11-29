const {Command} = require('discord.js-commando');
const TitleCase = require('title-case');
const titleCase = TitleCase.titleCase;

module.exports = class GamesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'get-games',
            aliases: ['get-user', 'gg', 'getgames', 'getuser'],
            group: 'games',
            memberName: 'get-games',
            description: 'Fetches all of the games that a user plays.',
            throttling: {
                usages: 2,
                duration: 10
            },
            guildOnly: true,
            clientPermissions: ['SEND_MESSAGES'],
            args: [
                {
                    key: 'user',
                    prompt: 'What user would you like to search for?',
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
            message.client.postgresClient.query(`SELECT *
                                                 FROM gamesplayed
                                                 WHERE userid = $1`, [user.id]).then(res => {
                let games = [];
                res.rows.forEach((val) => {
                    if (message.guild.member(val.userid)) {
                        games.push(titleCase(val.gamename));
                    }
                });
                if (games.length > 0) {
                    const builder = new message.client.embedbuilder()
                        .setChannel(message.channel)
                        .setTime(60000); // Time is in milliseconds
                    let myEmbedArray = [];
                    let pages = [];
                    for (let i = 0; i < games.length; i++) {
                        let page = Math.floor(i / 10);
                        if (pages[page] === undefined) {
                            pages.push(games[i])
                        } else {
                            pages[page] += `\n${games[i]}`;
                        }
                    }
                    pages.forEach(page => {
                        let newEmbed = new message.client.discord.MessageEmbed();
                        newEmbed.addField('\u200b', page);
                        myEmbedArray.push(newEmbed);
                    });
                    builder
                        .setEmbeds(myEmbedArray)
                        .setTitle(message.client.i18next.t("userPlays", {"lng": lng}) + ` ${user.username}:`)
                        .build();
                } else {
                    message.reply("No games found for " + user.username)
                }
            }).catch(err => {
                message.client.log(err);
                return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
            });
        }
    }
};