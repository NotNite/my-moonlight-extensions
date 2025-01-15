import { Snowflake } from "@moonlight-mod/types";

function makeUrl(path: string): URL {
  return new URL(moonlight.getConfigOption<string>("decor", "baseUrl")! + path);
}

const logger = moonlight.getLogger("decor/api");

const api = {
  async getUsers(ids: Snowflake[]): Promise<Record<Snowflake, string>> {
    logger.debug("Getting users", ids);
    const url = makeUrl("api/users");
    url.searchParams.append("ids", JSON.stringify(ids));

    return await fetch(url, {
      cache: "default"
    }).then((res) => res.json());
  }
};

export default api;
