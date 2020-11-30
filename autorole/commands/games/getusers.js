const {Command} = require('discord.js-commando');

module.exports = class GamesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'get-users',
            aliases: ['find-users', 'getusers', 'gu'],
            group: 'games',
            memberName: 'get-users',
            description: 'Fetches all of the users that play a specified game on a server.',
            throttling: {
                usages: 2,
                duration: 10
            },
            guildOnly: true,
            clientPermissions: ['SEND_MESSAGES'],
            args: [
                {
                    key: 'gamename',
                    prompt: 'What game would you like to search for?',
                    type: 'string'
                }
            ]
        });
    }

    // noinspection JSCheckFunctionSignatures
    async run(message, {gamename}) {
        let status = (await message.client.getServerConfig(message.guild))['gamesservices'];
        let lng = (await message.client.getServerConfig(message.guild))['language'];
        if (lng === undefined) {
            lng = "en"
        }
        console.log(status);
        if (!status) {
            return message.say(message.client.i18next.t("gamesServicesDisabled", {"lng": lng}))
        } else {
            message.client.postgresClient.query(`SELECT *
                                                 FROM gamesplayed
                                                 WHERE gamename = $1`, [gamename.toLowerCase()]).then(res => {
                let users = [];
                res.rows.forEach((val) => {
                    if (message.guild.member(val.userid)) {
                        users.push({"name": message.guild.member(val.userid).displayName, "value": `<@${val.userid}>`});
                    }
                });
                if(users.length>0) {
                    const builder = new message.client.embedbuilder()
                        .setChannel(message.channel)
                        .setTime(60000); // Time is in milliseconds
                    let myEmbedArray = [];
                    for (let i = 0; i < users.length; i++) {
                        let page = Math.floor(i / 5);
                        if (myEmbedArray[page] === undefined) {
                            myEmbedArray.push(new message.client.discord.MessageEmbed())
                        }
                        myEmbedArray[page].addField(users[i].name, users[i].value);
                    }
                    builder
                        .setEmbeds(myEmbedArray)
                        .setTitle(message.client.i18next.t("usersPlay", {"lng": lng, "gamename": gamename}))
                        .build();
                } else {
                    message.reply("No users found who play " + gamename + ".")
                }
                if (users.length < 2) {
                    // noinspection SqlResolve
                    message.client.postgresClient.query('SELECT * FROM (SELECT gamename, SIMILARITY(gamename, $1) FROM gamefrequency WHERE count > 20) AS gamesimilarity WHERE similarity > 0.3 ORDER BY similarity', [gamename.toLowerCase().trim()])
                        .then(res => {
                            if (res.rowCount > 0) {
                                let suggestions = [];
                                res.rows.forEach(val => {
                                    suggestions.push(val.gamename)
                                });
                                message.say(`Did you mean: ${suggestions.join(', ')}`)
                            }
                        }).catch(err => {
                        message.client.log(err);
                        return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
                    });
                }
            }).catch(err => {
                message.client.log(err);
                return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
            });
        }
    }
};