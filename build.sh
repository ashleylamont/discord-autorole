#!/usr/bin/env bash

DH_USER=alex4108 # Docker hub user

cd autorole
docker build -t ${DH_USER}/autorole .
cd ../
cd setup
docker build -t ${DH_USER}/autorole-setup .

