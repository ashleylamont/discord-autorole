const {Command} = require('discord.js-commando');

module.exports = class NoRolesConfig extends Command {
    constructor(client) {
        super(client, {
            name: 'no-roles',
            aliases: ['no-roles-config', 'no-existing-roles', 'no-existing-roles-config', 'nr'],
            group: 'rolebindings',
            memberName: 'no-roles-config',
            description: 'Toggles whether or not the bot will give roles to users who do not have roles already. Useful for servers with verification channels, etc.',
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
        let status = (await message.client.getServerConfig(message.guild))["givetonoroles"]
        message.client.postgresClient.query('UPDATE serverconfig SET givetonoroles=$1 WHERE serverid = $2', [!status, message.guild.id])
            .then(res => {
                return message.reply('Giving roles to users without existing roles is now ' + (status ? 'disabled' : 'enabled') + '.')
            })
    }
};
