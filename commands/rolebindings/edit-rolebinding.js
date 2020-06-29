const {Command} = require('discord.js-commando');

module.exports = class RolebindingCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'edit-rolebinding',
            aliases: ['edit-role'],
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
    run(message, {rolebinding, role, gamename, sendMessages, removeWhenInactive}) {

        message.client.postgresClient.query(`SELECT * FROM rolebindings WHERE rolebinding=$1 AND serverid=$2`, [rolebinding, message.guild.id]).then(res => {

            if (res.rowCount === 0) {
                let lng = message.client.serverConfigCache.find(val => {
                    return val["serverid"] === message.guild.id
                })["language"];
                return message.say(message.client.i18next.t("editRoleNoneApplicable", {"lng": lng}))
            } else {
                message.client.postgresClient.query(`UPDATE rolebindings SET roleid=$1, gamename=$2, sendmessages=$3, removewheninactive=$4 WHERE rolebinding=$5 AND serverid=$6 RETURNING *`, [role.id, gamename.toLowerCase(), sendMessages, removeWhenInactive, rolebinding, message.guild.id]).then(res => {

                    let val = res.rows[0];
                    let newEmbed = new message.client.discord.MessageEmbed()
                        .setTitle("Role Binding")
                        .addField("Role", `<@&${val.roleid}>`, true)
                        .addField("Game", val.gamename, true)
                        .addField("Rolebinding ID", val.rolebinding, true)
                        .addField("Send Messages?", (val.sendmessages) ? `Currently sending messages when I assign <@&${val.roleid}>` : `Not sending messages when I assign <@&${val.roleid}>`)
                        .addField("Remove Role?", (val.removewheninactive) ? `Currently removing <@&${val.roleid}> when users stop playing ${val.gamename}` : `Not removing <@&${val.roleid}> when users stop playing ${val.gamename}`);
                    return message.embed(newEmbed);

                }).catch(err => {
                    let lng = message.client.serverConfigCache.find(val => {
                        return val["serverid"] === message.guild.id
                    })["language"];
                    if (lng === undefined) {
                        lng = "en"
                    }
                    message.client.log(err);
                    return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
                });
            }

        }).catch(err => {
            let lng = message.client.serverConfigCache.find(val => {
                return val["serverid"] === message.guild.id
            })["language"];
            message.client.log(err);
            return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
        });


    }
};
