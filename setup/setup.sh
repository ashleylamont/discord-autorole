#!/usr/bin/env bash

echo "Initializing postgres schema..."

psql postgresql://${pgUser}:${pgPassword}@${pgHost}/${pgDatabase} << EOF
    $(cat schema.sql)
EOF

echo "Init postgres schema success!"

touch /init/db-ready

exit 0