const {Command} = require('discord.js-commando');

module.exports = class killBotCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'kill-bot',
            group: 'util',
            memberName: 'kill-bot',
            description: 'Forces the bot to exit the current instance and return an exit code of 1 so it can restart.',
            examples: ['kill-bot'],
            hidden: true,
            ownerOnly: true
        });
    }

    run(msg) {
        msg.reply("Bye bye.");
        setTimeout(function () {
            process.exit(1);
        }, 1000);
    }
};
