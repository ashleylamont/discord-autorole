const {Command} = require('discord.js-commando');

module.exports = class LocaleCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'create-rolebinding',
            aliases: ['set-role'],
            group: 'rolebindings',
            memberName: 'create-rolebinding',
            description: 'Creates a new rolebinding based on the parameters provided.',
            details: 'Creates a new rolebinding based on the parameters provided. Make sure to either use `!create-rolebinding` on its own or wrap the game name in "quotes" if it has a space in it!',
            examples: ['!create-rolebinding @Raid Night "Destiny 2" no yes'],
            throttling: {
                usages: 2,
                duration: 10
            },
            guildOnly: true,
            clientPermissions: ['MANAGE_ROLES', 'SEND_MESSAGES'],
            userPermissions: ['MANAGE_ROLES'],
            args: [
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
                    type: 'boolean',
                    default: true
                }, {
                    key: 'removeWhenInactive',
                    prompt: 'Would you like me to remove the role when people stop playing the game?',
                    type: 'boolean',
                    default: false
                }
            ]
        });
    }

    // noinspection JSCheckFunctionSignatures
    run(message, {role, gamename, sendMessages, removeWhenInactive}) {

        message.client.postgresClient.query(`INSERT INTO rolebindings (serverid,roleid,gamename, sendmessages, removewheninactive) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [message.guild.id, role.id, gamename.toLowerCase(), sendMessages, removeWhenInactive]).then(res => {

            let val = res.rows[0];

            console.log(`User ${message.author.username} created a rolebinding (${val.rolebinding}) for ${gamename} and ${role.name} on ${message.guild.name}`);

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
            console.error(err);
            return message.say(message.client.i18next.t("errorMsg", {"lng": lng}))

        });
    }
};
