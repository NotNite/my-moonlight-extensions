import Flux, { Store } from "@moonlight-mod/wp/discord/packages/flux";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import { Snowflake } from "@moonlight-mod/types";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import { UserStore } from "@moonlight-mod/wp/common_stores";
import { Decoration, NewDecoration, Preset } from "../types";
import { openOAuth2Modal } from "@moonlight-mod/wp/discord/modules/oauth2/index";

const logger = moonlight.getLogger("decor/stores");
const FOUR_HOURS = 1000 * 60 * 60 * 4;

const UserActionCreators = spacepack.require("discord/actions/UserActionCreators");

// fsr persiststore isn't working if we have the fields on the class and this is how discord does it so this works
const auth: {
  tokens: Record<Snowflake, string>;
  agreedToGuidelines: boolean;
} = {
  tokens: {},
  agreedToGuidelines: false
};

class DecorAuthStore extends Flux.PersistedStore<any> {
  authorized: boolean = false;

  constructor() {
    const checkAuthorized = () => {
      this.authorized = auth.tokens?.[UserStore.getCurrentUser().id] != null;
      this.emitChange();
    };

    super(Dispatcher, {
      CONNECTION_OPEN: checkAuthorized,
      CONNECTION_OPEN_SUPPLEMENTAL: checkAuthorized
    });
  }

  initialize(state?: { tokens: Record<Snowflake, string>; agreedToGuidelines: boolean }) {
    if (state) {
      auth.tokens = state.tokens;
      auth.agreedToGuidelines = state.agreedToGuidelines;
    }
  }

  private setToken(id: Snowflake, token: string) {
    auth.tokens[id] = token;
    if (!this.authorized) this.authorized = true;
    this.emitChange();
  }

  get currentUser(): Snowflake {
    return UserStore.getCurrentUser().id;
  }

  get token() {
    return auth.tokens[this.currentUser];
  }

  authorize() {
    return new Promise<void>((resolve, reject) =>
      openOAuth2Modal(
        {
          scopes: ["identify"],
          responseType: "code",
          redirectUri: moonlight.getConfigOption<string>("decor", "baseUrl")! + "api/authorize",
          permissions: 0n,
          clientId: moonlight.getConfigOption<string>("decor", "appId")!,
          cancelCompletesFlow: false,
          callback: async (response: { location: string }) => {
            try {
              const url = new URL(response.location);
              url.searchParams.append("client", "moonlight");

              const req = await fetch(url);
              if (!req.ok) throw new Error(req.statusText);

              const token = await req.text();
              this.setToken(this.currentUser, token);
              resolve();
            } catch (e) {
              logger.error("Failed to authorize:", e);
              reject(e);
            }
          }
        },
        reject
      )
    );
  }

  agreeToGuidelines() {
    auth.agreedToGuidelines = true;
    this.emitChange();
  }

  logout() {
    delete auth.tokens[this.currentUser];
    this.authorized = false;
    this.emitChange();
  }

  getState() {
    return { ...auth };
  }

  private makeUrl(path: string): URL {
    return new URL(moonlight.getConfigOption<string>("decor", "baseUrl")! + path);
  }

  private async fetchApi(path: URL, options?: RequestInit) {
    logger.trace("Fetching:", path);
    const headers = { ...options?.headers } as Record<string, string>;
    if (this.token != null) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(path, {
      ...options,
      headers
    });

    if (res.ok) return res;
    else throw new Error(await res.text());
  }

  async getUsers(ids: Snowflake[]): Promise<Record<Snowflake, string>> {
    logger.debug("Getting users", ids);
    const url = this.makeUrl("api/users");
    url.searchParams.append("ids", JSON.stringify(ids));
    return await this.fetchApi(url).then((res) => res.json());
  }

  async getUserCreatedDecorations(id: string = "@me"): Promise<Decoration[]> {
    const url = this.makeUrl(`api/users/${id}/decorations`);
    return await this.fetchApi(url).then((res) => res.json());
  }

  async getUserCurrentDecoration(id: string = "@me"): Promise<Decoration | null> {
    const url = this.makeUrl(`api/users/${id}/decoration`);
    return await this.fetchApi(url).then((res) => res.json());
  }

  async getPresets(): Promise<Preset[]> {
    const url = this.makeUrl(`api/decorations/presets`);
    return await this.fetchApi(url).then((res) => res.json());
  }

  async selectDecoration(decoration: Decoration | NewDecoration | null): Promise<string | Decoration> {
    const formData = new FormData();

    if (!decoration) {
      formData.append("hash", "null");
    } else if ("hash" in decoration) {
      formData.append("hash", decoration.hash);
    } else if ("file" in decoration) {
      formData.append("image", decoration.file);
      formData.append("alt", decoration.alt ?? "null");
    }

    return await this.fetchApi(this.makeUrl(`api/users/${this.currentUser}/decoration`), {
      method: "PUT",
      body: formData
    }).then((c) => (decoration && "file" in decoration ? c.json() : c.text()));
  }

  async deleteDecoration(decoration: Decoration) {
    await this.fetchApi(this.makeUrl(`api/decorations/${decoration.hash}`), { method: "DELETE" });
  }
}
// @ts-expect-error buh
DecorAuthStore.persistKey = "DecorAuthStore";
const decorAuthStore = new DecorAuthStore();

class DecorDecorationStore extends Store<any> {
  userCreatedDecorations: Decoration[];
  userCurrentDecoration: Decoration | null;

  constructor() {
    super(Dispatcher);
    this.userCreatedDecorations = [];
    this.userCurrentDecoration = null;
  }

  async updateForCurrentUser() {
    if (!decorAuthStore.authorized) return;
    this.userCreatedDecorations = await decorAuthStore.getUserCreatedDecorations(decorAuthStore.currentUser);
    this.userCurrentDecoration = await decorAuthStore.getUserCurrentDecoration(decorAuthStore.currentUser);
    this.emitChange();
  }

  setDecoration(decoration: Decoration | null) {
    this.userCurrentDecoration = decoration;
    this.emitChange();
  }

  addDecoration(decoration: Decoration) {
    this.userCreatedDecorations.push(decoration);
    this.emitChange();
  }
}
const decorDecorationStore = new DecorDecorationStore();

class DecorCacheStore extends Store<any> {
  private queuedUsers = new Set<Snowflake>();
  private cacheTimes = new Map<Snowflake, number>();
  private users = new Map<Snowflake, string | null>();
  private locked = false;
  private pendingUsers = new Set<Snowflake>();

  constructor() {
    super(Dispatcher);
    setInterval(this.tick.bind(this), 1000);
  }

  private async tick() {
    if (this.locked) return;
    this.locked = true;

    const inQueue = Array.from(this.queuedUsers);
    let didAnything = false;

    try {
      if (inQueue.length !== 0) {
        const obj = await decorAuthStore.getUsers(inQueue);

        for (const [id, hash] of Object.entries(obj)) {
          this.users.set(id as Snowflake, hash);
          didAnything = true;
        }

        // Add users without decorations
        const included = Object.keys(obj);
        for (const user of inQueue.filter((id) => !included.includes(id))) {
          this.users.set(user as Snowflake, null);
          didAnything = true;
        }
      }
    } catch (e) {
      logger.error("Failed to fetch users from Decor:", e);
    } finally {
      const now = Date.now();
      for (const user of inQueue) {
        this.cacheTimes.set(user, now);
        this.queuedUsers.delete(user);
      }

      this.locked = false;
      if (didAnything) this.emitChange();
    }
  }

  getUser(id: Snowflake, canAnimate?: boolean) {
    if (!id) return null;

    const cacheTime = this.cacheTimes.get(id);
    if (cacheTime != null && Date.now() > cacheTime + FOUR_HOURS) {
      this.users.delete(id);
      this.cacheTimes.delete(id);
    }

    let hash = this.users.get(id);
    if (hash !== undefined) {
      if (hash == null) return null;
      if (canAnimate === false) hash = hash.replace("a_", "");
      return moonlight.getConfigOption<string>("decor", "cdnUrl")! + hash + ".png";
    }

    if (!this.queuedUsers.has(id)) {
      this.queuedUsers.add(id);
      return null;
    }

    return null;
  }

  setUser(id: Snowflake, hash: string | null) {
    this.users.set(id, hash);
    this.emitChange();
  }

  // We decided to only do this on hover of some things because otherwise it leans into automation territory
  async ensureOrLookupUser(id: Snowflake) {
    const existing = UserStore.getUser(id);
    if (existing != null) return;
    if (this.pendingUsers.has(id)) return;

    logger.trace("Looking up user:", id);
    this.pendingUsers.add(id);
    try {
      await UserActionCreators.getUser(id);
      this.pendingUsers.delete(id);
    } catch (e) {
      logger.error("Failed to lookup user:", e);
    }
  }
}
const decorCacheStore = new DecorCacheStore();

export {
  decorCacheStore as DecorCacheStore,
  decorAuthStore as DecorAuthStore,
  decorDecorationStore as DecorDecorationStore
};
