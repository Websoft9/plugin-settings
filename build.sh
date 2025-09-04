#!/bin/bash
yarn build
rm -rf /usr/share/cockpit/settings/*
cp -r /data/plugin-cockpit/plugin-settings/build/* /usr/share/cockpit/settings/