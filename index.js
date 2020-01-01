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
        console.log('connected to the database')
    }
});

// Load localisations and i18next.
console.log("Initialising localisation modules and locale files.");
let localisation = require('./locale.json');
const i18next = require('i18next');
i18next.init(localisation).then(function (t) {
    // initialized and ready to go!
});
let nonEnglishServers = [];

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

            postgresClient.query(`SELECT * FROM serverlocales WHERE serverid=$1`, [guild.id]).then(res => {

                if (res.rowCount === 0) {
                    postgresClient.query(`INSERT INTO serverlocales (serverid,language) VALUES ($1,$2)`, [guild.id, "en"]).then(res => {

                        if (verbose) {
                            console.log(`Added ${guild.name} (${guild.id}) to the localisation database.`)
                        }

                    }).catch(err => {
                        console.log(err.stack);
                        Sentry.captureException(err);
                    });
                } else {
                    if (nonEnglishServers.includes(res.rows[0].serverid) === false && res.rows[0].language !== "en") {
                        nonEnglishServers.push(res.rows[0].serverid);
                        console.log(`Recorded server ${res.rows[0].serverid} as a non-english speaking server.`);
                    }
                }

            }).catch(err => {
                console.log(err.stack);
                Sentry.captureException(err);
            });

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

                                    // I know this is terrible and its a sin and I should really replace this with its own separate code rather than hacking it into the existing function, but fuck it, it works.
                                    // NOTE: ONLY EVER USE MSG HERE FOR THE CONTEXT.
                                    sendMessage({
                                        "author": guildMember.user,
                                        "guild": guild
                                    }, "msg", "gaveRoleMsg", {
                                        "gameName": rolebinding.gamename,
                                        "guildName": guild.name,
                                        "roleName": roleName
                                    });
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

function sendMessage(message, context, key, params) {
    let serverid = message.guild.id;
    if (nonEnglishServers.includes(serverid)) {
        postgresClient.query(`SELECT * FROM serverlocales WHERE serverid=$1`, [serverid]).then(res => {

            if (res.rowCount === 0) {
                console.log(`No locale found in database for server ${serverid}`);
                Sentry.captureException(`No locale found in database for server ${serverid}`);
                switch (context) {
                    case "send":
                        message.channel.send("I'm sorry, there was an error getting your server's language. Try again in a couple of minutes, or join the support server at discord.gg/EJDvNsK");
                        break;
                    case "reply":
                        message.reply("I'm sorry, there was an error getting your server's language. Try again in a couple of minutes, or join the support server at discord.gg/EJDvNsK");
                        break;
                    case "msg":
                        message.author.send(`I'm sorry, there was an error getting your server (${message.guild.name}) language. Try again in a couple of minutes, or join the support server at discord.gg/EJDvNsK`);
                        break;
                    default:
                        console.log("Missing message context.");
                        Sentry.captureException("Missing message context.");
                        break;
                }
            } else {
                let options;
                if (params === null || params === undefined) {
                    options = {};
                } else {
                    options = params;
                }
                options["lng"] = res.rows[0].language;

                switch (context) {
                    case "send":
                        message.channel.send(i18next.t(key, options));
                        break;
                    case "reply":
                        message.reply(i18next.t(key, options));
                        break;
                    case "msg":
                        message.author.send(i18next.t(key, options));
                        break;
                    default:
                        message.reply(i18next.t("errorMsg", options));
                        console.log("Missing message context.");
                        Sentry.captureException("Missing message context.");
                        break;
                }
            }

        }).catch(err => {
            console.log(err.stack);
            Sentry.captureException(err);
        });
    } else {
        let options;
        if (params === null || params === undefined) {
            options = {};
        } else {
            options = params;
        }
        options["lng"] = "en";

        switch (context) {
            case "send":
                message.channel.send(i18next.t(key, options));
                break;
            case "reply":
                message.reply(i18next.t(key, options));
                break;
            case "msg":
                message.author.send(i18next.t(key, options));
                break;
            default:
                message.reply(i18next.t("errorMsg", options));
                console.log("Missing message context.");
                Sentry.captureException("Missing message context.");
                break;
        }
    }
}

discordClient.on('message', message => {

    if (!(!message.content.startsWith(prefix) || message.author.bot) && allowedChannels.includes(message.channel.type)) {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            sendMessage(message, "reply", "adminRequiredMsg");
            return message.reply("Sorry, this bot is currently only accessible to users with the `ADMINISTRATOR` permission.");
        }
        const args = message.content.slice(prefix.length).split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === "set-role") {
            // usage: !set-role @role gameName

            if (message.mentions.roles.first() === undefined) {
                sendMessage(message, "reply", "setRoleMissingRole");
            }
            args.shift();
            if (args[0] === undefined) {
                sendMessage(message, "reply", "setRoleMissingGame");
            }
            let gameName = args.join(" ").toLowerCase();

            postgresClient.query(`SELECT * FROM rolebindings WHERE serverid=$1 and roleid=$2 and gamename=$3`, [message.guild.id.toString(), message.mentions.roles.first().id, gameName]).then(res => {

                if (res.rows.length === 0) {

                    postgresClient.query(`INSERT INTO rolebindings (serverid,roleid,gamename) VALUES ($1,$2,$3)`, [message.guild.id.toString(), message.mentions.roles.first().id, gameName]).then(res => {

                        sendMessage(message, "send", "setRoleSuccess");
                        console.log(`User ${message.author.username} created a rolebinding for ${gameName} and ${message.mentions.roles.first().name} on ${message.guild.name}`);

                    }).catch(err => {
                        sendMessage(message, "reply", "errorMsg");
                        console.log(err.stack);
                        Sentry.captureException(err);
                    });

                } else {
                    sendMessage(message, "send", "setRoleDuplicate");
                }

            }).catch(err => {
                sendMessage(message, "reply", "errorMsg");
                console.log(err.stack);
                Sentry.captureException(err);
            });

        } else if (command === "clear-role") {
            // usage: !clear-role @role gameName

            if (message.mentions.roles.first() === undefined) {
                sendMessage(message, "reply", "clearRoleMissingRole");
            }
            args.shift();
            if (args[0] === undefined) {
                sendMessage(message, "reply", "clearRoleMissingGame");
            }

            let gameName = args.join(" ").toLowerCase();

            postgresClient.query(`DELETE FROM rolebindings WHERE serverid=$1 and roleid=$2 and gamename=$3`, [message.guild.id.toString(), message.mentions.roles.first().id, gameName]).then(res => {

                if (res.rowCount === 0) {
                    sendMessage(message, "send", "clearRoleNoneFound");
                } else {
                    sendMessage(message, "send", "clearRoleSuccess");
                    console.log(`User ${message.author.username} deleted a rolebinding for ${gameName} and ${message.mentions.roles.first().name} on ${message.guild.name}`);
                }

            }).catch(err => {
                sendMessage(message, "reply", "errorMsg");
                console.log(err.stack);
                Sentry.captureException(err);
            });

        } else if (command === 'get-roles') {
            // usage: !get-roles

            postgresClient.query(`SELECT * FROM rolebindings WHERE serverid=$1`, [message.guild.id.toString()]).then(res => {

                if (res.rowCount === 0) {
                    sendMessage(message, "send", "clearRoleNoneFound")
                } else {
                    res.rows.forEach((val) => {
                        sendMessage(message, "send", "getRolesSuccess", {
                            "roleName": message.guild.roles.get(val.roleid).name,
                            "gameName": val.gamename
                        });
                    })
                }

            }).catch(err => {
                sendMessage(message, "msg", "errorMsg");
                console.log(err.stack);
                Sentry.captureException(err);
            });
        } else if (command === "locale") {
            // usage: !locale -> get available locales
            //usage: !locale locale -> Select locale

            if (args[0] === undefined) {
                let languages = "";
                i18next.languages.filter(val => {
                    return val !== "dev"
                }).forEach((val, index) => {
                    if (index === 0) {
                        languages += val;
                    } else {
                        languages += ", " + val;
                    }
                });
                sendMessage(message, "send", "localeAvailable", {"locales": languages});
            } else {
                if (i18next.languages.includes(args[0])) {
                    postgresClient.query(`UPDATE serverlocales SET language=$1 WHERE serverid=$2`, [args[0], message.guild.id]).then(res => {

                        console.log(`Updated ${message.guild.name}'s language to use ${args[0]}.`);
                        sendMessage(message, "send", "localeChanged");

                    }).catch(err => {
                        sendMessage(message, "reply", "errorMsg");
                        console.log(err.stack);
                        Sentry.captureException(err);
                    });
                } else {
                    sendMessage(message, "reply", "localeFailure");
                    console.log(`User tried to use language "${args[0]}".`);
                }
            }

        } else if (command === 'help') {
            sendMessage(message, "reply", "helpReply");
            sendMessage(message, "msg", "helpMsg");
        }
    }
});

// login to Discord with your app's token
discordClient.login(token);