// Load config file
const {prefix, token, pgUser, pgPassword, pgDatabase, pgConnectonString, pgHost, topggToken, sentryDSN, ownerId, inviteURL} = require('./config.json');

// initialise sentry for error tracking
const Sentry = require('@sentry/node');
Sentry.init({dsn: sentryDSN});

// require the discord.js module
const Discord = require('discord.js');

// load performance api
const {performance} = require('perf_hooks');

// discord commando module
const {CommandoClient} = require('discord.js-commando');
const path = require('path');
const client = new CommandoClient({
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
        unknownCommand: false
    })
    .registerCommandsIn(path.join(__dirname, 'commands'));

// Optional events
dbl.on('posted', () => {
    console.log('Server count posted!');
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
    console.log(`Logged in as ${client.user.tag}! (${client.user.id})`);
    client.user.setActivity('@AutoRole help');

    setInterval(function () {
        let t1 = performance.now();

        client.guilds.forEach((val) => {
            let guild = val;

            client.postgresClient.query(`SELECT * FROM serverconfig WHERE serverid=$1`, [guild.id]).then(res => {

                if (res.rowCount === 0) {
                    client.postgresClient.query(`INSERT INTO serverconfig (serverid,language) VALUES ($1,$2)`, [guild.id, "en"]).then(res => {

                        if (verbose) {
                            console.log(`Added ${guild.name} (${guild.id}) to the localisation database.`)
                        }

                    }).catch(err => {
                        console.log(err.stack);
                        Sentry.captureException(err);
                    });
                }

            }).catch(err => {
                console.log(err.stack);
                Sentry.captureException(err);
            });

            client.postgresClient.query(`SELECT * FROM rolebindings WHERE serverid=$1`, [guild.id]).then(res => {

                res.rows.forEach((val) => {
                    let rolebinding = val;
                    let users = guild.members;
                    users.forEach((val) => {

                        let guildMember = val;
                        let user = guildMember.user;
                        let roleName = guild.roles.get(rolebinding.roleid).name;
                        if (!user.bot && guildMember.presence.activity !== null && guildMember.presence.activity.type === "PLAYING") {
                            if (guildMember.roles.has(rolebinding.roleid) === false && guildMember.presence.activity.name.toLowerCase() === rolebinding.gamename) {
                                guildMember.roles.add(rolebinding.roleid).then(res => {
                                    console.log(`Gave ${guildMember.displayName} the role ${roleName} on server ${guild.name}`);
                                    if (rolebinding.sendmessages) {
                                        let lng = client.serverConfigCache.find(val => {
                                            return val["serverid"] === guild.id
                                        })["language"];
                                        user.send(client.i18next.t("gaveRoleMsg", {
                                            lng: lng,
                                            gameName: rolebinding.gamename,
                                            roleName: roleName,
                                            guildName: guild.name
                                        }));
                                    }
                                });
                            }
                        }
                        if (!user.bot && rolebinding.removewheninactive && guildMember.roles.has(rolebinding.roleid)) {
                            let currentActivity = "";
                            if (guildMember.presence.activity !== null) {
                                currentActivity = guildMember.presence.activity.name.toLowerCase();
                            }
                            if (currentActivity !== rolebinding.gamename) {
                                guildMember.roles.remove(rolebinding.roleid);
                                console.log(`Took away the role ${roleName} from ${guildMember.displayName} on server ${guild.name}`);
                                if (rolebinding.sendmessages) {
                                    let lng = client.serverConfigCache.find(val => {
                                        return val["serverid"] === guild.id
                                    })["language"];
                                    user.send(client.i18next.t("removedRoleMsg", {
                                        lng: lng,
                                        gameName: rolebinding.gamename,
                                        roleName: roleName,
                                        guildName: guild.name
                                    }));
                                }
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

client.on('error', console.error);

// login to Discord with your app's token
client.login(token);
