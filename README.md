# Replicache BYOB Cloudflare

Implementation of the Build Your Own Backend (BYOB) tutorial for Replicache, on Cloudflare Workers and Cloudflare D1.

This implements the [Global Versioning](https://doc.replicache.dev/strategies/global-version) Strategy 

## Technology

### Repo wide technology

This is a monorepo but it is configured to be run mainly from the project root.

[SST Ion](https://ion.sst.dev/docs/) is used to manage most of the infrastructure (except pusher which is required to be setup manually see [pusher](#pusher) below). Secrets are all managed via SST so all you need to get started is your Cloudflare API token. 

Dev and prod environments are configured in line with SST best practice. All key commands in the project root have a `:dev` and `:prod` suffix to indicate which environment they will run in. This means you can choose to test your changes in dev and then deploy to prod. Or if you wish to skip dev and run straight to prod that is fine too!

### Sync Server

Cloudflare Worker with [Hono](https://github.com/honojs/hono) as the API framework.

Cloudflare D1 SQLite database using [Drizzle](https://github.com/drizzle-team/drizzle) ORM.

[Pusher](https://pusher.com/) for implementation of the [poke](https://doc.replicache.dev/byob/poke). (There may be scope to move this to Durable Objects to remain entirely on Cloudflare.)

### Web App

React + Vite + Replicache + Replicache React

Deploy to Cloudflare using a Cloudflare Worker, and the SST Ion [Static Site](https://github.com/sst/ion/tree/dev/examples/cloudflare-static-site) construct.

# Getting Started

## Install SST

Install SST globally

```sh
curl -fsSL https://ion.sst.dev/install | bash
```

## Cloudflare

### Setup Cloudflare API Token

SST Ion requires your cloudflare API token, it needs worker and d1 write access.

1. Add this to the `.env.example` file in the repository root. 
2. Run `sst secret load .env.example && sst secret load .env.example --stage=dev` to load the secrets into SST.

## Pusher

Pusher is used to implement the [poke](https://doc.replicache.dev/byob/poke) feature. This can be ommitted if you wish getting started, but clients will need to refresh to receive updates from a different client.

Create a free pushed account at [pusher](https://pusher.com/) and create a channel, then visit the `Api Keys` page and retreive the values below.

### Server Keys

set values in root .env file

PusherAppId=
PusherKey=
PusherSecret=
PusherCluster=

Load them into SST (from the project root)

```sh 
sst secret load .env --stage=dev && sst secret load .env
```

### Client Keys

There is  `apps/web/.env.example` file in the `web` app directory, there are two client side variables required to be set for pusher to work. These are loaded by SST in prod, and in dev they are used from the `apps/web/.env.example` file.

set values in `apps/web/.env.example` file

VITE_PUBLIC_PUSHER_KEY=
VITE_PUBLIC_PUSHER_CLUSTER=

Load them into SST (from the project root)

```sh 
sst secret load apps/web/.env.example --stage=dev && sst secret load apps/web/.env.example
```

## Create initial deployments

Use SST to create the initial worker and D1 deployments

```sh
pnpm run deploy:prod
```

```sh
pnpm run deploy:dev
```

## Migrate database

Migrate the database to the latest version

```sh
pnpm generate
```

```sh
pnpm run migrate:dev
```

```sh
pnpm run migrate:prod
```

### Seed Database

You need to seed the replicache_server table with a single row with version = 1, on a fresh deployment.

The following commands run drizzle studio for both dev and prod, navigate to the `replicache_server` table and insert a row with version = 1 for each.

```sh
pnpm studio:dev
```

```sh
pnpm studio:prod
```

## Run the app in dev

This command uses SST to run your dev worker in the dev stage and the web application locally.

```sh
pnpm dev
```

## Deploy to prod at any time 

This command uses SST to deploy your prod worker and web application to prod.

```sh
pnpm deploy:prod
```

## Test away

Thats it! Hopefully it was fairly straight forward, keen for any contributions to make this better and easier to configure. Feel free to create issues for these things.

## Clean up

Remove all infrastructure from dev and prod in cloudflare with the following commands.

```sh
pnpm remove:dev && pnpm remove:prod
```
