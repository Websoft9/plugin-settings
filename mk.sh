#!/bin/bash
cd /data/cockpit-plugins/plugin-settings/build
yarn build
while [ ! -d "/usr/share/cockpit/settings" ]; do
  sleep 1
done
cp -r ./* /usr/share/cockpit/settings/
