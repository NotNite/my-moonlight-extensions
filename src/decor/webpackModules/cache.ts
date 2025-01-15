import { Snowflake } from "@moonlight-mod/types";
import api from "@moonlight-mod/wp/decor_api";

const FOUR_HOURS = 1000 * 60 * 60 * 4;

const cacheTimes = new Map<Snowflake, number>();
const users = new Map<Snowflake, string | null>();
const queuedUsers = new Set<Snowflake>();
const logger = moonlight.getLogger("decor/cache");

export default function getCache(id: Snowflake, canAnimate?: boolean) {
  if (!id) return null;

  const cacheTime = cacheTimes.get(id);
  if (cacheTime != null && Date.now() > cacheTime + FOUR_HOURS) {
    users.delete(id);
    cacheTimes.delete(id);
  }

  let hash = users.get(id);
  if (hash !== undefined) {
    if (hash == null) return null;
    if (canAnimate === false) hash = hash.replace("a_", "");
    return moonlight.getConfigOption<string>("decor", "cdnUrl")! + hash + ".png";
  }

  if (!queuedUsers.has(id)) {
    queuedUsers.add(id);
    return null;
  }

  return null;
}

let locked = false;
setInterval(async () => {
  if (locked) return;
  locked = true;

  const inQueue = Array.from(queuedUsers);

  try {
    if (inQueue.length !== 0) {
      const obj = await api.getUsers(inQueue);

      for (const [id, hash] of Object.entries(obj)) {
        users.set(id as Snowflake, hash);
      }

      // Add users without decorations
      const included = Object.keys(obj);
      for (const user of inQueue.filter((id) => !included.includes(id))) {
        users.set(user as Snowflake, null);
      }
    }
  } catch (e) {
    logger.error("Failed to fetch users from Decor:", e);
  } finally {
    const now = Date.now();
    for (const user of inQueue) {
      cacheTimes.set(user, now);
      queuedUsers.delete(user);
    }

    locked = false;
  }
}, 1000);
