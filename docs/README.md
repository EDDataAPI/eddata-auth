# Documentation

This directory contains documentation and confguration files relevant to all 
Ardent services, including the Authentication service. This documentation is 
not specifically related to authentication, this is just a home for it until 
there is somewhere else for it.

This should give some idea of how the stack is run in production - e.g. how the 
proxy server works, how the services are managed during deployment and how they 
recover in the event of a failure or system restart.

## Caddy

Caddy (a proxy server) reverse proxies requests for the Website the API and the 
Authentication service, they all run on seperate ports on the server (3000, 
3001, 3002, etc). The Collector, which ingests data from EDDN and saves it to 
databases, also runs on the server but does not run on a public facing port.

## PM2

PM2, a process monitor, is installed via NPM with `npm i pm2 -g` and is used by 
the GitHub Actions that handle deployment to stop/start services and is also 
configured to run any services started this way at startup, making recovery 
from a restart automatic.

## Deployment

The deployment pipelines are very simple and use GitHub Actions workflows 
to deploy changes over SSH. There is no downtime during  deployments, as the 
services are swapped out gracefully.

Deploying a new version of the API or the Auth service takes less than 30 
seconds while deploying a new version of website typically takes around 90 
seconds (as there is more work required to build the site). 

When a new release of a service is pushed to the main branch on GitHub, a 
GitHub action connects to the server with a deployment account and installs and 
builds each new release, then briefly stops the existing service, replaces it 
and starts the new version.

Because actually swapping out a service only involves swapping a pointer on 
disk to the release, the change over is very quick. Caddy is 
configured to hold requests during the switch over, so all an end user might 
experience is that a request takes a second longer; requests don't fail as 
Caddy holds them all during the second or so it takes to switch over.

## Database

The service does not require a dedicated database process, instead it uses a 
peformant interface to SQLite and leverages threading and in memory caching 
file system caching on Linux to provide fast in-memory access to multiple 
SQLite databases, using journaling with a Write Ahead Log which is non-blocking 
for readers and provides atmoic write support, making it fault tolerant in the 
event of a system failure. This approach works extremely well for 1-2 million 
writes a day and much heaver number of reads the service needs to perform.

During the in-game maintaince window, writing to the database is paused and 
backups are generated and the databases optimised. It is technically possible 
to do this while the system is running, but it's faster to handle this while 
all writing is paused and as the game is offline anyway, it makes sense to 
align the maintenance window for the services with that of the game itself.
