/* tslint:disable */
/* eslint-disable */
/// <reference path="../../sst-env.d.ts" />
// cloudflare
import "sst";
declare module "sst" {
	export interface Resource {
		DB: import("@cloudflare/workers-types").D1Database;
	}
}
