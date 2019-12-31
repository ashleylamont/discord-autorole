// NOTE THIS FILE WILL BE DEPRECATED SOON SINCE THE PROJECT WILL BE OVERHAULED USING POSTGRESQL
console.log("The script that has been executed is the legacy JSON script. The new script using postgresql should be run in its place.");


// require the discord.js module
const Discord = require('discord.js');

// create a new Discord client
const client = new Discord.Client();

// Load config file
const {prefix, token} = require('./config.json');

// load existing user data and role bindings
const fs = require('fs');
let rawData = fs.readFileSync('users.json');
let savedUsers = JSON.parse(rawData);
rawData = fs.readFileSync('roles.json');
let roleBindings = JSON.parse(rawData);


// when the client is ready, run this code
client.once("ready", () => {
    // client.user.setActivity(`on ${client.guilds.size} servers`);
    console.log(`Ready to serve on ${client.guilds.size} servers, for ${client.users.size} users.`);

    client.user.setActivity("themselves.", {type: "PLAYING"});

    setInterval(function () {
        let userList = client.users.array();
        for (user in userList) {
            user = userList[user];
            if (savedUsers.hasOwnProperty(user.id) === false && !user.bot) {
                savedUsers[user.id] = {"games": [], "name": user.username}
            }
            if (user.presence.game !== null && !user.bot) {
                if (savedUsers[user.id]["games"].includes(user.presence.game.name.toLowerCase()) === false && user.presence.game.type === 0) {
                    savedUsers[user.id]["games"].push(user.presence.game.name.toLowerCase());
                    console.log(`Added ${user.presence.game.name.toLowerCase()} to ${user.username}`)
                }
            }
        }


        for (guildId in roleBindings) {
            guild = client.guilds.find(function (guild) {
                return guild.id === guildId;
            });

            for (i in roleBindings[guildId]) {
                guild.members.forEach((member) => {
                    if (!member.user.bot) {
                        if (savedUsers[member.id]["games"].includes(i)) {
                            let role = guild.roles.find(({name}) => name === roleBindings[guildId][i]);
                            if (member.roles.array().includes(role) === false) {
                                console.log(`Sent ${member.user.username} a message: Hey, I just noticed you played ${i} so I went ahead and gave you the role ${roleBindings[guildId][i]} on the server ${guild.name}`);
                                member.user.send(`Hey, I just noticed you played ${i} so I went ahead and gave you the role ${roleBindings[guildId][i]} on the server ${guild.name}`);
                                member.addRole(role);
                            }
                        }
                    }
                })
            }

        }


        // Save user and role info
        let data = JSON.stringify(savedUsers);
        fs.writeFileSync('users.json', data);
        data = JSON.stringify(roleBindings);
        fs.writeFileSync('roles.json', data);
    }, 10000);
});

client.on('message', message => {

    if (!(!message.content.startsWith(prefix) || message.author.bot)) {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply("Sorry, this bot is currently only accessible to users with the `ADMINISTRATOR` permission.");
        }
        const args = message.content.slice(prefix.length).split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'args-info') {
            if (!args.length) {
                return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
            }

            message.channel.send(`Command name: ${command}\nArguments: ${args}`);
        } else if (command === "help") {
            message.reply("Hi, This bot is still currently in very early development, and doesn't have help instructions yet, since it changes so often. Contact the bot's creator BenCo#1402 for more help.");
        } else if (command === "user-games") {
            if (!message.mentions.users.size) {
                return message.reply(`you need to tag a user in order to see the games they've played !`);
            }
            const taggedUser = message.mentions.users.first();
            let name;
            if (message.guild.members.get(taggedUser.id).nickname === null) {
                name = taggedUser.username;
            } else {
                name = message.guild.members.get(taggedUser.id).nickname;
            }

            if (savedUsers[taggedUser.id]["games"].length > 0) {
                message.channel.send(
                    `${name} has played: ${savedUsers[taggedUser.id]["games"]}`
                )
            } else {
                message.channel.send(`${name} has not played anything yet.`)
            }
        } else if (command === "played-game") {
            let gameName = args.join(" ").toLowerCase();
            let matchingUsers = [];
            for (user in savedUsers) {
                if (savedUsers[user]["games"].includes(gameName)) {
                    matchingUsers.push(savedUsers[user]["name"]);
                }
            }
            if (matchingUsers.length > 0) {
                message.channel.send(`The following user/s have played ${gameName}: ${matchingUsers}`);
            } else {
                message.channel.send(`I don't have anybody on my list for ${gameName}`)
            }
        } else if (command === "all-games") {
            if (message.author.id !== "238194337253556224") {
                return message.reply(`I'm sorry, I'm afraid I can't let you do that. (This command is only for the bot's creator)`)
            }

            let games = {};
            for (user in savedUsers) {
                if (savedUsers[user]["games"].length > 0) {
                    for (game in savedUsers[user]["games"]) {
                        if (games.hasOwnProperty(savedUsers[user]["games"][game]) === false) {
                            games[savedUsers[user]["games"][game]] = [];
                        }

                        games[savedUsers[user]["games"][game]].push(client.users.get(user).username);
                    }
                }
            }

            for (game in games) {
                message.channel.send(`The following users have played ${game}: ${games[game]}`)
            }
        } else if (command === "set-role") {
            // usage: !set-role @role gameName

            if (message.mentions.roles.first() === undefined) {
                return message.reply(`you have to @mention a role for this to work! *!set-role @role gameName*`)
            }
            args.shift();
            if (args[0] === undefined) {
                return message.reply(`you have to specify a game for this to work! *!set-role @role gameName*`)
            }
            let gameName = args.join(" ").toLowerCase();

            if (roleBindings.hasOwnProperty(message.guild.id)) {
                if (roleBindings[message.guild.id].hasOwnProperty(gameName)) {
                    roleBindings[message.guild.id][gameName] = message.mentions.roles.first().id;
                    message.channel.send(`Updated "${message.mentions.roles.first().name}" role to be applied to anybody who plays ${gameName}.`)
                } else {
                    roleBindings[message.guild.id][gameName] = message.mentions.roles.first().id;
                    message.channel.send(`Added "${message.mentions.roles.first().name}" role to be applied to anybody who plays ${gameName}.`)
                }
            } else {
                roleBindings[message.guild.id] = {};
                roleBindings[message.guild.id][gameName] = message.mentions.roles.first().name;
                message.channel.send(`Added "${message.mentions.roles.first().name}" role to be applied to anybody who plays ${gameName}.`)
            }

        } else if (command === "clear-role") {
            // usage: !clear-role @role

            if (message.mentions.roles.first() === undefined) {
                return message.reply("you have to @mention a role for this to work! `!clear-role @role`")
            } else {

                const roleName = message.mentions.roles.first().name;

                if (roleBindings.hasOwnProperty(message.guild.id)) {
                    let deletedRole = false;
                    for (let i in roleBindings[message.guild.id]) {
                        if (roleBindings[message.guild.id][i] === message.mentions.roles.first().id) {
                            message.channel.send(`Deleting association with <@&${roleBindings[message.guild.id][i]}> and ${i}`);
                            delete roleBindings[message.guild.id][i];
                            deletedRole = true;
                        }
                    }
                    if (!deletedRole) {
                        message.channel.send(`No role association found.`);
                    } else {
                        message.channel.send(`Please note, this will not remove roles that have already been assigned to users. You will need to remove any roles already assigned manually, or delete the role and create a new one to remove them all at once.`)
                    }
                } else {
                    message.channel.send(`This server does not have any roles set.`)
                }
            }

        }
    }
});

// login to Discord with your app's token
client.login(token);
