// Load config file
const {prefix, token, pgUser, pgPassword, pgDatabase, pgConnectonString, pgHost, topggToken, sentryDSN} = require('./config.json');

// initialise sentry for error tracking
const Sentry = require('@sentry/node');
Sentry.init({dsn: sentryDSN});

// require the discord.js module
const Discord = require('discord.js');

// load performance api
const {performance} = require('perf_hooks');

// create a new Discord discordClient
const discordClient = new Discord.Client();

// connect to top.gg
const DBL = require("dblapi.js");
const dbl = new DBL(topggToken, discordClient);

// Optional events
dbl.on('posted', () => {
    console.log('Server count posted!');
});

dbl.on('error', e => {
    console.log(`Oops! ${e}`);
});

// connect to the postgres database
const Postgres = require('pg');
const postgresClient = new Postgres.Client({
    user: pgUser,
    password: pgPassword,
    database: pgDatabase,
    connectionString: pgConnectonString,
    host: pgHost,
    port: 5432
});

// get console args
const args = require('minimist')(process.argv.slice(2));
var verbose = false;
if (args["_"].includes("verbose")) {
    verbose = true;
}

console.log("Attempting to connect to the database.");
postgresClient.connect(err => {
    if (err) {
        console.error('connection error', err.stack)
    } else {
        console.log('connected')
    }
});

// when the discordClient is ready, run this code
discordClient.once("ready", () => {
    console.log(`Ready to serve on ${discordClient.guilds.size} servers, for ${discordClient.users.size} users.`);
    /*setInterval(() => {
        dbl.postStats(discordClient.guilds.size, discordClient.shard.id, discordClient.shard.count);
    }, 1800000);*/

    discordClient.user.setActivity("!help for help", {type: "PLAYING"});

    setInterval(function () {
        let t1 = performance.now();

        discordClient.guilds.forEach((val) => {
            let guild = val;
            postgresClient.query(`SELECT * FROM rolebindings WHERE serverid=$1`, [guild.id]).then(res => {

                res.rows.forEach((val) => {
                    let rolebinding = val;
                    let users = guild.members;
                    users.forEach((val) => {

                        let guildMember = val;
                        let user = guildMember.user;
                        if (!user.bot && guildMember.presence.game !== null && guildMember.presence.game.type === 0) {
                            if (guildMember.roles.has(rolebinding.roleid) === false && guildMember.presence.game.name.toLowerCase() === rolebinding.gamename) {
                                let roleName = guild.roles.get(rolebinding.roleid).name;
                                guildMember.addRole(rolebinding.roleid).then(res => {
                                    console.log(`Gave ${guildMember.displayName} the role ${roleName} on server ${guild.name}`);
                                    guildMember.user.send(`Hey, I noticed you played \`${rolebinding.gamename}\` on \`${guild.name}\` so I gave you the role \`${roleName}\`.`);
                                });
                            }
                        }
                    })
                })

            }).catch(err => {
                console.log(err.stack);
                Sentry.captureException(err);
            });
        });

        let t2 = performance.now();
        if (verbose) {
            console.log(`Ran user update loop in ${t2 - t1} milliseconds.`)
        }

    }, 5000);
});


// The channels that the bot is allowed to respond to commands in. https://discord.js.org/#/docs/main/stable/class/DMChannel?scrollTo=type
const allowedChannels = ["text"];

discordClient.on('message', message => {

    if (!(!message.content.startsWith(prefix) || message.author.bot) && allowedChannels.includes(message.channel.type)) {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply("Sorry, this bot is currently only accessible to users with the `ADMINISTRATOR` permission.");
        }
        const args = message.content.slice(prefix.length).split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === "set-role") {
            // usage: !set-role @role gameName

            if (message.mentions.roles.first() === undefined) {
                return message.reply(`you have to @mention a role for this to work! \`!set-role @role gameName\``)
            }
            args.shift();
            if (args[0] === undefined) {
                return message.reply(`you have to specify a game for this to work! \`!set-role @role gameName$\``)
            }
            let gameName = args.join(" ").toLowerCase();

            postgresClient.query(`SELECT * FROM rolebindings WHERE serverid=$1 and roleid=$2 and gamename=$3`, [message.guild.id.toString(), message.mentions.roles.first().id, gameName]).then(res => {

                if (res.rows.length === 0) {

                    postgresClient.query(`INSERT INTO rolebindings (serverid,roleid,gamename) VALUES ($1,$2,$3)`, [message.guild.id.toString(), message.mentions.roles.first().id, gameName]).then(res => {

                        message.channel.send("Created the role binding.\nJust remember to double check your spelling, since I can only work if its spelled exactly as it appears in discord. ( Don't worry about upper/lower case though :wink: )");
                        console.log(`User ${message.author.username} created a rolebinding for ${gameName} and ${message.mentions.roles.first().name} on ${message.guild.name}`);

                    }).catch(err => {
                        message.reply("I'm sorry, there was an error.");
                        console.log(err.stack);
                        Sentry.captureException(err);
                    });

                } else {
                    message.channel.send("This role binding already exists.")
                }

            }).catch(err => {
                message.reply("I'm sorry, there was an error.");
                console.log(err.stack);
                Sentry.captureException(err);
            });

        } else if (command === "clear-role") {
            // usage: !clear-role @role gameName

            if (message.mentions.roles.first() === undefined) {
                return message.reply(`you have to @mention a role for this to work! \`!clear-role @role gameName\``)
            }
            args.shift();
            if (args[0] === undefined) {
                return message.reply(`you have to specify a game for this to work! \`!clear-role @role gameName$\``)
            }

            let gameName = args.join(" ").toLowerCase();

            postgresClient.query(`DELETE FROM rolebindings WHERE serverid=$1 and roleid=$2 and gamename=$3`, [message.guild.id.toString(), message.mentions.roles.first().id, gameName]).then(res => {

                if (res.rowCount === 0) {
                    message.channel.send("I couldn't find any role bindings with that game name and role on this server. Are you sure you spelt it right?");
                } else {
                    message.channel.send("Deleted any role bindings matching the given role and game name on this server.")
                    console.log(`User ${message.author.username} deleted a rolebinding for ${gameName} and ${message.mentions.roles.first().name} on ${message.guild.name}`);
                }

            }).catch(err => {
                message.reply("I'm sorry, there was an error.");
                console.log(err.stack);
                Sentry.captureException(err);
            });

        } else if (command === 'help') {
            message.reply("I sent you a dm with instructions.");
            message.author.send(
                `Hey there, this is gonna be kinda improv since I'm writing this knowing that it will probably change soon.\nAnyways, the bot uses a system of rolebindings to manage what game gives what role. The bot manages most of this for you, so what you need to know is this:\n\n\`!set-role @role game name\` to create a role binding, this will give anybody who plays "game name" the role @role on the server the command is run on.\n\`!clear-role @role game name\` to remove a role binding. This will prevent the bot from giving any more users the role, although it will not remove already applied roles.\n\nI hope you enjoy this!`
            );
        }
    }
});

// login to Discord with your app's token
discordClient.login(token);