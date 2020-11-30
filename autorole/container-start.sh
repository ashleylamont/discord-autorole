#!/usr/bin/env bash

## Wait for setup container to be done
waitForInit() { 
    if [ ! -f '/init/db-ready' ]; then
        echo "Waiting for DB to be initialized"
        sleep 1
        waitForInit
    fi
}

waitForInit
node index.js