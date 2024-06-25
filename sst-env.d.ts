/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
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
