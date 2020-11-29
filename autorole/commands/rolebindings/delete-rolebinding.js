const {Command} = require('discord.js-commando');

module.exports = class RolebindingCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'delete-rolebinding',
            aliases: ['delete-role', 'clear-role', 'deleterolebinding', 'dr'],
            group: 'rolebindings',
            memberName: 'delete-rolebinding',
            description: 'Deletes an existing rolebinding.',
            details: 'Deletes an existing rolebinding based on rolebinding id. Use `!get-roles` to get all available rolebindings on your server and to find their rolebinding ID.',
            examples: ['!delete-rolebinding 42'],
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
                message.say("Deleting the following role binding:").catch(async (err) => {
                    let lng = (await message.client.getServerConfig(message.guild))['language'];
                    if (lng === undefined) {
                        lng = "en"
                    }
                    message.client.log(err);
                    return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
                });
                let val = res.rows[0];
                let newEmbed = new message.client.discord.MessageEmbed()
                    .setTitle("Role Binding")
                    .addField("Role", `<@&${val.roleid}>`, true)
                    .addField("Game", val.gamename, true)
                    .addField("Rolebinding ID", val.rolebinding, true)
                    .addField("Send Messages?", (val.sendmessages) ? `Currently sending messages when I assign <@&${val.roleid}>` : `Not sending messages when I assign <@&${val.roleid}>`)
                    .addField("Remove Role?", (val.removewheninactive) ? `Currently removing <@&${val.roleid}> when users stop playing ${val.gamename}` : `Not removing <@&${val.roleid}> when users stop playing ${val.gamename}`);
                message.embed(newEmbed).catch(async (err) => {
                    let lng = (await message.client.getServerConfig(message.guild))['language'];
                    message.client.log(err);
                    return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))
                });
                message.client.postgresClient.query(`DELETE
                                                     FROM rolebindings
                                                     WHERE rolebinding = $1
                                                       AND serverid = $2
                                                     RETURNING *`, [rolebinding, message.guild.id]).then(() => {

                    return message.say(`Deleted the rolebinding.\nTo re-enable it type ${message.anyUsage(`create-rolebinding @${message.guild.roles.cache.get(val.roleid).name} "${val.gamename}" ${(val.sendmessages) ? "yes" : "no"} ${(val.removewheninactive) ? "yes" : "no"}`)}`);

                }).catch(async (err) => {
                    let lng = (await message.client.getServerConfig(message.guild))['language'];
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
