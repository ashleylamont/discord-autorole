const {Command} = require('discord.js-commando');

module.exports = class RolebindingCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'edit-rolebinding',
            aliases: ['edit-role', 'editrolebinding', 'er'],
            group: 'rolebindings',
            memberName: 'edit-rolebinding',
            description: 'Modifies an existing rolebinding.',
            details: 'Modifies an existing rolebinding by replacing the existing options with new ones. Use `!get-roles` to get all available rolebindings on your server and to find their rolebinding ID.',
            examples: ['!edit-rolebinding 42 @Raid Night "Destiny 2" no yes'],
            throttling: {
                usages: 2,
                duration: 10
            },
            guildOnly: true,
            clientPermissions: ['MANAGE_ROLES', 'SEND_MESSAGES'],
            userPermissions: ['MANAGE_ROLES'],
            args: [
                {
                    key: 'rolebinding',
                    prompt: 'Enter the rolebinding id shown when you use `!get-rolebindings`. This will usually be a 2-3 digit number.',
                    type: 'integer'
                },
                {
                    key: 'role',
                    prompt: 'What role would you like to assign to users?',
                    type: 'role'
                }, {
                    key: 'gamename',
                    prompt: 'What game would you like the bot to watch for people playing?',
                    type: 'string'
                }, {
                    key: 'sendMessages',
                    prompt: 'Would you like me to send messages to users when I give them the role?',
                    type: 'boolean'
                }, {
                    key: 'removeWhenInactive',
                    prompt: 'Would you like me to remove the role when people stop playing the game?',
                    type: 'boolean'
                }
            ]
        });
    }

    // noinspection JSCheckFunctionSignatures
    async run(message, {rolebinding, role, gamename, sendMessages, removeWhenInactive}) {

        message.client.postgresClient.query(`SELECT *
                                             FROM rolebindings
                                             WHERE rolebinding = $1
                                               AND serverid = $2`, [rolebinding, message.guild.id]).then(async (res) => {

            if (res.rowCount === 0) {
                let lng = (await message.client.getServerConfig(message.guild))['language'];
                return message.say(message.client.i18next.t("editRoleNoneApplicable", {"lng": lng}))
            } else {
                message.client.postgresClient.query(`UPDATE rolebindings
                                                     SET roleid=$1,
                                                         gamename=$2,
                                                         sendmessages=$3,
                                                         removewheninactive=$4
                                                     WHERE rolebinding = $5
                                                       AND serverid = $6
                                                     RETURNING *`, [role.id, gamename.toLowerCase(), sendMessages, removeWhenInactive, rolebinding, message.guild.id]).then(res => {

                    let val = res.rows[0];
                    let newEmbed = new message.client.discord.MessageEmbed()
                        .setTitle("Role Binding")
                        .addField("Role", `<@&${val.roleid}>`, true)
                        .addField("Game", val.gamename, true)
                        .addField("Rolebinding ID", val.rolebinding, true)
                        .addField("Send Messages?", (val.sendmessages) ? `Currently sending messages when I assign <@&${val.roleid}>` : `Not sending messages when I assign <@&${val.roleid}>`)
                        .addField("Remove Role?", (val.removewheninactive) ? `Currently removing <@&${val.roleid}> when users stop playing ${val.gamename}` : `Not removing <@&${val.roleid}> when users stop playing ${val.gamename}`);
                    message.embed(newEmbed);

                    message.client.postgresClient.query('SELECT * FROM gamefrequency WHERE gamename = $1', [gamename.toLowerCase()])
                        .then(res => {
                            if (res.rowCount === 0) {
                                message.say("I've never seen anybody play that game before, check you spelt it right and make sure you put the \"game name\" in quotes if it has multiple words in it.");
                                // noinspection SqlResolve
                                message.client.postgresClient.query('SELECT * FROM (SELECT gamename, SIMILARITY(gamename, $1) FROM gamefrequency WHERE count > 20) AS gamesimilarity WHERE similarity > 0.3 ORDER BY similarity', [gamename.toLowerCase().trim()])
                                    .then(res => {
                                        if (res.rowCount > 0) {
                                            let suggestions = [];
                                            res.rows.forEach(val => {
                                                suggestions.push(val.gamename)
                                            });
                                            message.say(`Did you mean: ${suggestions.join(', ')}`);
                                            message.say('Use the `edit-rolebinding` command to change the game name.')
                                        }
                                    }).catch(err => {
                                    message.client.log(err);
                                    return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
                                });
                            } else {
                                if (res.rows[0].count < 10) {
                                    message.say("I've haven't seen many people play that game before, check you spelt it right and make sure you put the \"game name\" in quotes if it has multiple words in it.");
                                    // noinspection SqlResolve
                                    message.client.postgresClient.query('SELECT * FROM (SELECT gamename, SIMILARITY(gamename, $1) FROM gamefrequency WHERE count > 20) AS gamesimilarity WHERE similarity > 0.3 ORDER BY similarity', [gamename.toLowerCase().trim()])
                                        .then(res => {
                                            if (res.rowCount > 0) {
                                                let suggestions = [];
                                                res.rows.forEach(val => {
                                                    suggestions.push(val.gamename)
                                                });
                                                message.say(`Did you mean: ${suggestions.join(', ')}`);
                                                message.say('Use the `edit-rolebinding` command to change the game name.')
                                            }
                                        }).catch(err => {
                                        message.client.log(err);
                                        return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
                                    });
                                }
                            }
                        })

                }).catch(async (err) => {
                    let lng = (await message.client.getServerConfig(message.guild))['language'];
                    if (lng === undefined) {
                        lng = "en"
                    }
                    message.client.log(err);
                    return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
                });
            }

        }).catch(async (err) => {
            let lng = (await message.client.getServerConfig(message.guild))['language'];
            message.client.log(err);
            return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
        });


    }
};
