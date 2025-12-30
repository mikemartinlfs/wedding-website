import { Redis } from "@upstash/redis";

export function getRedis(write=true){
  const url=(process.env.KV_REST_API_URL || "").trim();
  const token=(write ? process.env.KV_REST_API_TOKEN : process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();

  return new Redis({ url, token });
}
