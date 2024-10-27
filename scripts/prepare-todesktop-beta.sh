#!/bin/bash
set -e

# Update properties
cat todesktop.json | jq -r '.id |= "201202u1n7yn5b0"' | jq -r '.appId |= "im.beeper.beta"' > todesktop.beta.json
cat package.json | jq -r '.productName |= "Beeper Beta"' > package.beta.json
mv todesktop.beta.json todesktop.json
mv package.beta.json package.json
