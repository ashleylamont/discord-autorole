# AutoRole Discord Bot

## What does it do?

This bot watches your discord server users and assigns roles based on their presence.  For example, if a user is playing Valorant and their presence displays this, the bot can assign a configured role, based on the game name.

Start with the `!help` command to the bot, once he is joined to a server and deployed.

This repository holds the code needed to deploy the application.

## Set up discord bot

1. Create a Discord Application in [Discord Developers Portal](https://discord.com/developers) 
1. Create a Bot for the application
1. Enable Server Members & Presence Intents
1. Note down the bot client ID from the Bot page.
1. Join the bot to your server: https://discord.com/oauth2/authorize?client_id=123&scope=bot&permissions=268462144 where 123 is the Client ID provided from the Discord Developers Portal.
1. Note down Bot Token, needed for `token` parameter during launch.
1. Enable both "Presence Intent" and "Server Members Intent" under the bot's settings in the Discord Developers Portal.

## Running in container

The bot can be started using [Docker Compose](https://docs.docker.com/compose/).

`ownerId=123 token=123 docker-compose up -d` to run the deployment as a service.  Replace Owner ID with your Discord User ID, and Token with your Discord Bot TOken retrieved from the earlier section.

If you'd like to run the environment on an ARM architecture, you can do that with the alternative config: `ownerId=123 token=123 docker-compose -f docker-compose-arm.yml up -d ` 

## Environment Variables

This section defines the environment variables required by the `autorole` container.  They are set by default in the docker-compose deployment.

* `token`: The discord bot token for this bot.
* `testToken`: _optional_ Set this if you intend to strap the bot to Discord using an alternative (test) token
* `pgUser`: Postgres Username for DB connection
* `pgPassword`: Postgres Password for DB connection
* `pgHost`: Postgres Hostname for DB connection
* `topggToken`: _optional_ the top GG API token used to report # of discord servers where this bot is installed.
* `sentryDSN`: _optional_ failed INSERTS get reported to Sentry, if configured.
* `ownerId`: The User ID of the bot owner for Discord, used for designating the bot owner.

Local development example: `token=123 testToken=${token} pgUser=postgres pgPassword=postgres pgHost=127.0.0.1 ownerId=123 node index.js`

## Thanks

@dfcowell for (docker init conatiners)[https://github.com/docker/compose/issues/6855]
