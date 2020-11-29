# AutoRole Discord Bot

## Usage

## Running in container

The bot can be started using (Docker Compose)[].

The owner ID should be set to the desired Discord User ID.

The token should be a bot token from Discord, with *permission integer 26688*.

`ownerId=123 token=123 docker-compose up -d` to run the container as a service.

## Environment Variables

All variables are required unless noted.  Pay special attention to `ownerId`

* `token`: The discord bot token for this bot.
* `testToken`: _optional_ Set this if you intend to strap the bot to Discord using an alternative (test) token
* `pgUser`: Postgres Username for DB connection
* `pgPassword`: Postgres Password for DB connection
* `pgHost`: Postgres Hostname for DB connection
* `topggToken`: _optional_ the top GG API token used to report # of discord servers where this bot is installed.
* `sentryDSN`: _optional_ failed INSERTS get reported to Sentry, if configured.
* `ownerId`: (!) The User ID of the bot owner for Discord, used for designating the bot owner.  *SET THIS BEFORE YOU RUN THE COMPOSE FILE!*
* `inviteURL`: The invite URL for the bot's support server.

## Thanks

@dfcowell for [docker init conatiners](https://github.com/docker/compose/issues/6855)