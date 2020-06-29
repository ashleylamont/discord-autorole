const {Command} = require('discord.js-commando');

module.exports = class GamesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'get-users',
            aliases: ['find-users'],
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
    run(message, {gamename}) {
        let status = message.client.serverConfigCache.find(val => {
            return val["serverid"] === message.guild.id
        })["gamesservices"];
        let lng = message.client.serverConfigCache.find(val => {
            return val["serverid"] === message.guild.id
        })["language"];
        if (lng === undefined) {
            lng = "en"
        }
        if (!status) {
            return message.say(message.client.i18next.t("gamesServicesDisabled", {"lng": lng}))
        } else {
            message.client.postgresClient.query(`SELECT *
                                                 FROM gamesplayed
                                                 WHERE gamename = $1`, [gamename.toLowerCase()]).then(res => {
                message.say(message.client.i18next.t("usersPlay", {"lng": lng, "gamename": gamename}));
                res.rows.forEach((val) => {
                    if (message.guild.member(val.userid)) {
                        message.say(` - ${message.guild.member(val.userid).displayName} (${message.guild.member(val.userid).user.username}#${message.guild.member(val.userid).user.discriminator})`)
                    }
                });

            }).catch(err => {
                message.client.log(err);
                return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
            });
        }


    }
};
