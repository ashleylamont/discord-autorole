// Load config file
const {token, pgUser, pgPassword, pgDatabase, pgConnectonString, pgHost, topggToken, sentryDSN, ownerId, inviteURL} = require('./config.json');

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
    invite: inviteURL
});

client.discord = Discord;
// Load localisations and i18next.
console.log("Initialising localisation modules and locale files.");
let localisation = require('./locale.json');
client.i18next = require('i18next');
client.i18next.init(localisation).then(function (t) {
    // initialized and ready to go!
});

const sqlite = require('sqlite');

client.setProvider(
    sqlite.open(path.join(__dirname, 'settings.sqlite3')).then(db => new Commando.SQLiteProvider(db))
).catch(console.error);

// connect to top.gg
const DBL = require("dblapi.js");
const dbl = new DBL(topggToken, client);

client.registry
    .registerDefaultTypes()
    .registerGroups([
        ['rolebindings', 'Role Binding Config Commands'],
        ['localisation', 'Localisation Commands'],
        ['util', 'Utility Commands']
    ])
    .registerDefaultGroups()
    .registerDefaultCommands({
        unknownCommand: false,
        help: false
    })
    .registerCommandsIn(path.join(__dirname, 'commands'));


// Optional events
dbl.on('posted', () => {
    if (verbose) {
        console.log('Server count posted!')
    }
});

dbl.on('error', e => {
    console.log(`Oops! ${e}`);
});

// connect to the postgres database
const Postgres = require('pg');
client.postgresClient = new Postgres.Client({
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
        client.guilds.get('591956618145562627').channels.get('671213111767728148').send(args[1]);
        // 3. Pass along arguments to console.log
        console.log.apply(console, args);
    };
    client.log = log;

    log(`Logged in as ${client.user.tag}! Ready to serve ${client.users.size} users on ${client.guilds.size} servers.`);
    if (verbose) {
        client.user.setActivity('@AutoRole help');
    } else {
        client.user.setActivity('MAINTENANCE');
    }

    setInterval(function () {
        let t1 = performance.now();

        client.guilds.forEach((val) => {
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

            client.postgresClient.query(`SELECT * FROM rolebindings WHERE serverid=$1`, [guild.id]).then(res => {

                res.rows.forEach((val) => {
                    let rolebinding = val;
                    let users = guild.members;
                    users.forEach((val) => {

                        let guildMember = val;
                        let user = guildMember.user;
                        if (guild.roles.get(rolebinding.roleid) !== undefined) {
                            let roleName = guild.roles.get(rolebinding.roleid).name;

                            if (!user.bot && guildMember.presence.activity !== null && guildMember.presence.activity.type === "PLAYING") {
                                if (guildMember.roles.has(rolebinding.roleid) === false && guildMember.presence.activity.name.toLowerCase() === rolebinding.gamename) {
                                    guildMember.roles.add(rolebinding.roleid).then(() => {
                                        log(`Gave ${guildMember.displayName} the role ${roleName} on server ${guild.name}`);
                                        if (rolebinding.sendmessages) {
                                            let lng = client.serverConfigCache.find(val => {
                                                return val["serverid"] === guild.id
                                            })["language"];
                                            if (lng === undefined) {
                                                lng = "en"
                                            }
                                            user.send(client.i18next.t("gaveRoleMsg", {
                                                lng: lng,
                                                gameName: rolebinding.gamename,
                                                roleName: roleName,
                                                guildName: guild.name
                                            })).catch(err => {
                                                console.error(err);
                                                console.error(`Error sending gave role message for ${roleName} to ${guildMember.displayName} on server ${guild.name}`);
                                                log(`Guild is owned by ${guild.owner.user.username}#${guild.owner.user.discriminator}. Guild ID: ${guild.id}`);
                                            });
                                        }
                                    }).catch(err => {
                                        console.error(err);
                                        console.error(`Error giving ${roleName} to ${guildMember.displayName} on server ${guild.name}`);
                                        log(`Guild is owned by ${guild.owner.user.username}#${guild.owner.user.discriminator}. Guild ID: ${guild.id}`);
                                    });
                                }
                            }
                            if (!user.bot && rolebinding.removewheninactive && guildMember.roles.has(rolebinding.roleid)) {
                                let currentActivity = "";
                                if (guildMember.presence.activity !== null) {
                                    currentActivity = guildMember.presence.activity.name.toLowerCase();
                                }
                                if (currentActivity !== rolebinding.gamename) {
                                    guildMember.roles.remove(rolebinding.roleid).catch(err => {
                                        console.error(err);
                                        console.error(`Error removing ${roleName} from ${guildMember.displayName} on server ${guild.name}`);
                                        log(`Guild is owned by ${guild.owner.user.username}#${guild.owner.user.discriminator}. Guild ID: ${guild.id}`);
                                    });
                                    log(`Took away the role ${roleName} from ${guildMember.displayName} on server ${guild.name}`);
                                    if (rolebinding.sendmessages) {
                                        let lng = client.serverConfigCache.find(val => {
                                            return val["serverid"] === guild.id
                                        })["language"];
                                        if (lng === undefined) {
                                            lng = "en"
                                        }
                                        user.send(client.i18next.t("removedRoleMsg", {
                                            lng: lng,
                                            gameName: rolebinding.gamename,
                                            roleName: roleName,
                                            guildName: guild.name
                                        })).catch(err => {
                                            console.error(err);
                                        });
                                    }
                                }
                            }
                        }
                    })
                })

            }).catch(err => {
                log(err.stack);
                Sentry.captureException(err);
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
client.login(token);
