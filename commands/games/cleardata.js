const {Command} = require('discord.js-commando');

module.exports = class GamesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'clear-data',
            aliases: ['delete-data', 'deregister', 'cd', 'cleardata'],
            group: 'games',
            memberName: 'clear-data',
            description: 'Removes a user from the database.',
            throttling: {
                usages: 4,
                duration: 5
            },
            guildOnly: false,
            clientPermissions: ['SEND_MESSAGES'],
            args: [
                {
                    key: 'confirm',
                    prompt: 'Are you sure you want to delete all of your recorded game activity? This action is irreversible',
                    type: 'boolean'
                }
            ]
        });
    }

    // noinspection JSCheckFunctionSignatures
    run(message, {confirm}) {
        if (confirm) {
            message.client.postgresClient.query(`DELETE
                                                 FROM gamesplayed
                                                 WHERE userid = $1`, [message.author.id.toString()])
                .then(() => {
                    message.reply("Deleted the data. Sorry to see you go ;(");
                })
        }
    }
};