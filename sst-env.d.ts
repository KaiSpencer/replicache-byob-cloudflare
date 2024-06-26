/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    CloudflareAccountId: {
      type: "sst.sst.Secret"
      value: string
    }
    CloudflareApiToken: {
      type: "sst.sst.Secret"
      value: string
    }
    DatabaseId: {
      type: "sst.sst.Secret"
      value: string
    }
    PusherAppId: {
      type: "sst.sst.Secret"
      value: string
    }
    PusherCluster: {
      type: "sst.sst.Secret"
      value: string
    }
    PusherKey: {
      type: "sst.sst.Secret"
      value: string
    }
    PusherSecret: {
      type: "sst.sst.Secret"
      value: string
    }
    SyncServer: {
      type: "sst.cloudflare.Worker"
      url: string
    }
    Web: {
      type: "sst.cloudflare.StaticSite"
      url: string
    }
  }
}
