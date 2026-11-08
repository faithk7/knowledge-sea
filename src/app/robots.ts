import type { MetadataRoute } from "next";
import { INDEXING_ENABLED } from "../lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: INDEXING_ENABLED ? { userAgent: "*", allow: "/" } : { userAgent: "*", disallow: "/" },
  };
}
