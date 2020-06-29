// get console args
const args = require('minimist')(process.argv.slice(2));
let verbose = false;
if (args["_"].includes("verbose")) {
    verbose = true;
}

// Load config file
const {token, testToken, pgUser, pgPassword, pgDatabase, pgHost, topggToken, sentryDSN, ownerId, inviteURL} = require('./config.json');

// initialise sentry for error tracking
const Sentry = require('@sentry/node');
Sentry.init({dsn: sentryDSN});

// require the discord.js module
const Discord = require('discord.js');

// load performance api
const {performance} = require('perf_hooks');

// discord commando module
const Commando = require('discord.js-commando');
const path = require('path');
const client = new Commando.CommandoClient({
    commandPrefix: '!',
    owner: ownerId,
    invite: inviteURL,
    ws: {
        intents: [
            'GUILD_PRESENCES',
            'GUILDS',
            'GUILD_MESSAGES',
            'DIRECT_MESSAGES'
        ]
    }
});

client.discord = Discord;
// Load localisations and i18next.
console.log("Initialising localisation modules and locale files.");
let localisation = require('./locale.json');
client.i18next = require('i18next');
client.i18next.init(localisation);

const sqlite = require('sqlite');

client.setProvider(
    sqlite.open(path.join(__dirname, 'settings.sqlite3')).then(db => new Commando.SQLiteProvider(db))
).catch(console.error);

// connect to top.gg
const DBL = require("dblapi.js");
if (!verbose) {
    const dbl = new DBL(topggToken, client);

    // Optional events
    dbl.on('posted', () => {
        if (verbose) {
            console.log('Server count posted!')
        }
    });

    dbl.on('error', e => {
        console.log(`Oops! ${e}`);
    });
}

client.registry
    .registerDefaultTypes()
    .registerGroups([
        ['rolebindings', 'Role Binding Config Commands'],
        ['localisation', 'Localisation Commands'],
        ['util', 'Utility Commands'],
        ['games', 'Games Commands']
    ])
    .registerDefaultGroups()
    .registerDefaultCommands({
        unknownCommand: false,
        help: false
    })
    .registerCommandsIn(path.join(__dirname, 'commands'));

// connect to the postgres database
const Postgres = require('pg');
client.postgresClient = new Postgres.Client({
    user: pgUser,
    password: pgPassword,
    database: pgDatabase,
    host: pgHost,
    port: 5432
});

console.log("Attempting to connect to the database.");
client.postgresClient.connect(err => {
    if (err) {
        console.error('connection error', err.stack)
    } else {
        console.log('connected to the database')
    }
});

client.serverConfigCache = [];
client.postgresClient.query(`SELECT * FROM serverconfig`).then(res => {

    client.serverConfigCache = res.rows;

}).catch(err => {
    console.log(err.stack);
    Sentry.captureException(err);
});


client.once('ready', () => {
    let log = function () {
        let LOG_PREFIX = new Date().getDate() + '.' + new Date().getMonth() + '.' + new Date().getFullYear() + ' / ' + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds();// 1. Convert args to a normal array
        let args = Array.prototype.slice.call(arguments);
        // 2. Prepend log prefix log string
        args.unshift(LOG_PREFIX + " ");
        client.guilds.cache.get('591956618145562627').channels.cache.get('671213111767728148').send(args[1]);
        // 3. Pass along arguments to console.log
        console.log.apply(console, args);
    };
    client.log = log;

    log(`Logged in as ${client.user.tag}! Ready to serve ${client.users.cache.size} users on ${client.guilds.cache.size} servers.`);
    if (!verbose) {
        client.user.setActivity('@AutoRole help');
    } else {
        client.user.setActivity('Testing new features');
    }

    client.on('presenceUpdate', (oldPresence, newPresence) => {
        if (!newPresence.user.bot) {
            let currentActivities = [];
            for (let activity in newPresence.activities) {
                currentActivities.push(newPresence.activities[activity].name.toLowerCase().trim())
            }

            let previousActivities = [];
            if (oldPresence !== null && oldPresence !== undefined) {
                for (let activity in oldPresence.activities) {
                    previousActivities.push(oldPresence.activities[activity].name.toLowerCase().trim())
                }
            }

            let newActivity = "";
            for (let activity in currentActivities) {
                if (!previousActivities.includes(currentActivities[activity])) {
                    newActivity = currentActivities[activity];
                    break
                }
            }

            if (newActivity !== "" && newActivity !== "custom status" && newActivity !== "spotify") {
                client.postgresClient.query('INSERT INTO gamesplayed(userid, gamename) VALUES ($1,$2) ON CONFLICT DO NOTHING', [newPresence.user.id.toString(), newActivity])
                    .catch(err => {
                        log(err.stack);
                        Sentry.captureException(err);
                    });
            }


            let guildId = newPresence.guild.available ? newPresence.guild.id : "";
            client.postgresClient.query('SELECT * FROM rolebindings WHERE serverid=$1', [guildId])
                .then(res => {
                    res.rows.forEach((roleBinding) => {
                        if (newPresence.guild.roles.cache.get(roleBinding.roleid) !== undefined) {
                            let roleName = newPresence.guild.roles.cache.get(roleBinding.roleid).name;
                            if (newPresence.member.roles.cache.has(roleBinding.roleid) === false && currentActivities.includes(roleBinding.gamename.toLowerCase())) {
                                newPresence.member.roles.add(roleBinding.roleid).then(() => {
                                    log(`Gave ${newPresence.member.displayName} the role ${roleName} on server ${newPresence.guild.name}`);
                                    if (roleBinding.sendmessages) {
                                        let lng = client.serverConfigCache.find(val => {
                                            return val["serverid"] === guildId
                                        })["language"];
                                        if (lng === undefined) {
                                            lng = "en"
                                        }
                                        newPresence.user.send(client.i18next.t("gaveRoleMsg", {
                                            lng: lng,
                                            gameName: roleBinding.gamename,
                                            roleName: roleName,
                                            guildName: newPresence.guild.name
                                        })).catch(err => {
                                            console.error(err);
                                            console.error(`Error sending gave-role message for ${roleName} to ${newPresence.member.displayName} on server ${newPresence.guild.name}`);
                                            log(`Guild is owned by ${newPresence.guild.owner.user.username}#${newPresence.guild.owner.user.discriminator}. Guild ID: ${guildId}`);
                                        });
                                    }
                                }).catch(err => {
                                    console.error(err);
                                    console.error(`Error giving ${roleName} to ${newPresence.member.displayName} on server ${newPresence.guild.name}`);
                                    log(`Guild is owned by ${newPresence.guild.owner.user.username}#${newPresence.guild.owner.user.discriminator}. Guild ID: ${guildId}`);
                                });
                            }
                            if (roleBinding.removewheninactive && newPresence.member.roles.cache.has(roleBinding.roleid)) {
                                if (!currentActivities.includes(roleBinding.gamename) && previousActivities.includes(roleBinding.gamename)) {
                                    newPresence.member.roles.remove(roleBinding.roleid).catch(err => {
                                        console.error(err);
                                        console.error(`Error removing ${roleName} from ${newPresence.member.displayName} on server ${newPresence.guild.name}`);
                                        log(`Guild is owned by ${newPresence.guild.owner.user.username}#${newPresence.guild.owner.user.discriminator}. Guild ID: ${guildId}`);
                                    });
                                    log(`Took away the role ${roleName} from ${newPresence.member.displayName} on server ${newPresence.guild.name}`);
                                    if (roleBinding.sendmessages) {
                                        let lng = client.serverConfigCache.find(val => {
                                            return val["serverid"] === guildId
                                        })["language"];
                                        if (lng === undefined) {
                                            lng = "en"
                                        }
                                        newPresence.user.send(client.i18next.t("removedRoleMsg", {
                                            lng: lng,
                                            gameName: roleBinding.gamename,
                                            roleName: roleName,
                                            guildName: newPresence.guild.name
                                        })).catch(err => {
                                            console.error(err);
                                        });
                                    }
                                }
                            }
                        }
                    })
                })
        }

    });

    setInterval(function () {
        let t1 = performance.now();

        client.guilds.cache.each((val) => {
            let guild = val;

            client.postgresClient.query('SELECT COUNT(*) FROM serverconfig WHERE serverid=$1', [guild.id]).then(res => {
                if (res.rows[0].count === '0') {
                    client.postgresClient.query(`INSERT INTO serverconfig (serverid,language) VALUES ($1,$2)`, [guild.id, "en"]).then(res => {

                        log(`Added ${guild.name} (${guild.id}) to the localisation database.`);
                        if (res.rowCount === 0) {
                            log(`Error adding ${guild.name} (${guild.id}) to the localisation database.`);
                        } else {
                            if (!(client.serverConfigCache.some((val) => {
                                return val.serverid === guild.id.toString();
                            }))) {
                                client.serverConfigCache.push({'serverid': guild.id.toString(), 'language': 'en'});
                            }
                        }

                    }).catch(err => {
                        log(err.stack);
                        Sentry.captureException(err);
                    });
                }
            });
        });

        let t2 = performance.now();
        if (verbose) {
            log(`Ran user update loop in ${t2 - t1} milliseconds.`)
        }

    }, 5000);
});

client.on('error', console.error);

// login to Discord with your app's token
if (verbose) {
    client.login(testToken);
} else {
    client.login(token);
}
