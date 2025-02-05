#!/bin/bash

# Stop any running instances
pm2 stop queue-system

# Build the application
npm run build

# Copy production env
cp .env.production .env

# Start with PM2
npm run pm2:start

# Save PM2 config
pm2 save

# Display logs
pm2 logs queue-system 