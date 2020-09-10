const {Command} = require('discord.js-commando');

module.exports = class UnknownCommandCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'unknown-command',
            group: 'util',
            memberName: 'unknown-command',
            description: 'Displays help information for when an unknown command is used.',
            examples: ['unknown-command kickeverybodyever'],
            unknown: true,
            hidden: true,
            guarded: true
        });
    }

    async run(msg) {
        let status;
        if (msg.guild === null || msg.guild === undefined) {
            status = true;
        } else {
            status = (await msg.client.getServerConfig(msg.guild))["unknownmessage"];
        }
        if (status) {
            return msg.reply(
                `Unknown command. Use ${msg.anyUsage(
                    'help',
                    msg.guild ? undefined : null,
                    msg.guild ? undefined : null
                )} to view the command list.\nIf this message keeps appearing when you use another bot, use ${msg.anyUsage('prefix')} followed by a new prefix to change the prefix to something unique.`
            );
        }
    }
};
