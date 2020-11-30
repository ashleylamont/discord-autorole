#!/usr/bin/env bash

DH_USER=alex4108 # Docker hub user

cd autorole
docker build -t ${DH_USER}/autorole:arm32v7 -f Dockerfile-arm .
docker build -t ${DH_USER}/autorole .

cd ../
cd setup
docker build -t ${DH_USER}/autorole-setup:arm32v7 -f Dockerfile-arm  .
docker build -t ${DH_USER}/autorole-setup .

docker push ${DH_USER}/autorole:arm32v7
docker push ${DH_USER}/autorole-setup:arm32v7

docker push ${DH_USER}/autorole-setup
docker push ${DH_USER}/autorole
