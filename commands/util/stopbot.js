const {Command} = require('discord.js-commando');

module.exports = class stopBotCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'stop-bot',
            group: 'util',
            memberName: 'stop-bot',
            description: "Forces the bot to exit the current instance and return an exit code of 0 so it won't restart.",
            examples: ['stop-bot'],
            hidden: true,
            ownerOnly: true
        });
    }

    run(msg) {
        msg.reply("Bye bye.");
        setTimeout(function () {
            process.exit(0);
        }, 1000);
    }
};
