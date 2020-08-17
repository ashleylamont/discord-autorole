const {Command} = require('discord.js-commando');
const {MessageEmbed} = require('discord.js');

module.exports = class killBotCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'invite',
            group: 'util',
            memberName: 'invite',
            description: 'Replies with an invite link.',
            examples: ['invite'],
        });
    }

    run(msg) {
        msg.embed(new MessageEmbed().setTitle("Autorole Bot").addField("Invite Link", "https://discord.com/oauth2/authorize?client_id=591955603308675073&scope=bot&permissions=26688"))
    }
};
