const {Command} = require('discord.js-commando');

module.exports = class DisableUnknownCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'disable-unknown-command',
            aliases: ['disable-unknown', 'disable-help', 'disableunkown', 'disableunkowncommand', 'du'],
            group: 'util',
            memberName: 'disable-unknown-command',
            description: 'Toggles the state of the builtin unknown-command command on a server.',
            throttling: {
                usages: 1,
                duration: 5
            },
            guildOnly: true,
            clientPermissions: ['SEND_MESSAGES'],
            userPermissions: ['MANAGE_GUILD'],
            hidden: false
        });
    }

    // noinspection JSCheckFunctionSignatures
    async run(message) {
        let status = (await message.client.getServerConfig(message.guild))["unknownmessage"];
        message.client.postgresClient.query('UPDATE serverconfig SET unknownmessage=$1 WHERE serverid = $2', [!status, message.guild.id])
            .then(res => {
                return message.reply('Unknown command is now ' + (status ? 'disabled' : 'enabled') + '.')
            })
    }
};
