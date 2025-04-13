import { MediaControlsStore } from "@moonlight-mod/wp/mediaControls_stores";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import type { MediaState } from "../types";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";

import { SpotifyStore } from "@moonlight-mod/wp/common_stores";
const { SpotifyAPI } = spacepack.require("discord/modules/spotify/SpotifyActionCreators");
const { Endpoints } = spacepack.require("discord/Constants");
const { HTTP } = spacepack.require("discord/utils/HTTPUtils");

const logger = moonlight.getLogger("Media Controls: Rich Presence");

const artworkCache = new Map();
const spotifyCache = new Map();

const DEFAULT_APP_ID = "1325969326150258708";

const LASTFM_API_KEY = "cba04ed41dff8bfb9c10835ee747ba94"; // taken from MusicBee
const lastfmBaseUrl = "https://ws.audioscrobbler.com/2.0/";

async function fetchArtworkFromLastFm(
  method: "album.getinfo" | "album.search",
  album: string,
  artist?: string,
  track?: string
): Promise<string | undefined> {
  const url = new URL(lastfmBaseUrl);
  url.searchParams.set("method", method);
  url.searchParams.set("album", album);

  if (artist != null && artist !== "") url.searchParams.set("artist", artist);

  if (track != null && track !== "") url.searchParams.set("track", track);

  url.searchParams.set("api_key", LASTFM_API_KEY);
  url.searchParams.set("format", "json");

  const data = await fetch(url).then((res) => res.json());

  return data?.album?.image[data?.album?.image?.length - 1]?.["#text"];
}

async function getArtworkFromLastFm(
  album?: string,
  artist?: string,
  track?: string,
  albumArtist?: string
): Promise<string> {
  if (!album) return "unknown";

  const mainArtist = artist?.split(", ")?.[0];
  const key = `${artist}_${album}`;
  const cached = artworkCache.get(key);

  if (cached) return cached;

  let url;

  if (!url && albumArtist && albumArtist !== "")
    url = await fetchArtworkFromLastFm("album.getinfo", album, albumArtist);

  if (!url && mainArtist) url = await fetchArtworkFromLastFm("album.getinfo", album, mainArtist);

  if (!url && artist && artist !== "") url = await fetchArtworkFromLastFm("album.getinfo", album, artist);

  if (!url && artist && artist !== "" && track && track !== "")
    url = await fetchArtworkFromLastFm("album.getinfo", album, artist, track);

  if (!url && artist && artist !== "") url = await fetchArtworkFromLastFm("album.search", album, artist);

  if (!url) url = await fetchArtworkFromLastFm("album.search", album);

  if (!url) {
    artworkCache.set(key, "unknown");
    return "unknown";
  } else {
    artworkCache.set(key, url);
    return url;
  }
}

// TODO: move these out of this extension
enum ActivityTypes {
  PLAYING,
  STREAMING,
  LISTENING,
  WATCHING,
  CUSTOM_STATUS,
  COMPETING,
  HANG_STATUS
}

enum ActivityFlags {
  INSTANCE = 1,
  JOIN = 1 << 1,
  SYNC = 1 << 4,
  PLAY = 1 << 5,
  PARTY_PRIVACY_FRIENDS = 1 << 6,
  PARTY_PRIVACY_VOICE_CHANNEL = 1 << 7,
  EMBEDDED = 1 << 8
}

type Activity = {
  application_id?: string;
  name: string;
  type: ActivityTypes;
  details: string;
  state?: string;
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  party?: {
    id?: string;
    size: [number, number];
  };
  sync_id?: string;
  flags?: ActivityFlags;
  buttons?: string[];
  metadata?: {
    button_urls?: string[];
    artist_ids?: string[];
    album_id?: string;
  };
  timestamps?: {
    start?: number;
    end?: number;
  };
};

let spotifyAccountId: string, spotifyToken: string;

Dispatcher.subscribe("SPOTIFY_ACCOUNT_ACCESS_TOKEN", (event: any) => {
  spotifyAccountId = event.accountId;
  spotifyToken = event.accessToken;
});
Dispatcher.subscribe("SPOTIFY_PROFILE_UPDATE", (event: any) => {
  const account = SpotifyStore.__getAccounts?.()?.[event.accountId];
  if (account) {
    spotifyAccountId = account.accountId;
    spotifyToken = account.accessToken;
  }
});

async function getSpotifyData(query: string) {
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "1");

  return await SpotifyAPI.get(spotifyAccountId, spotifyToken, {
    url: url
  }).then((res: any) => res.body);
}

function sendActivity(activity?: Activity) {
  Dispatcher.dispatch({
    type: "LOCAL_ACTIVITY_UPDATE",
    socketId: "mediaControls_richPresence",
    activity
  });
}

function regroupArtists(artist: string): string {
  return artist
    .replaceAll(" / ", "; ")
    .replaceAll("/", "; ")
    .replaceAll(", ", "; ")
    .replaceAll(" & ", "; ")
    .replaceAll("feat. ", "; ");
}

function buildSpotifyQuery(title: string, artist: string, albumArtist?: string, album?: string): string {
  let query = `track:${title
    .replace("(Original Mix)", "")
    .replace(/\(feat\. .+?\)/, "")
    .trim()}`;

  let queryArtist = "";
  if (albumArtist && albumArtist !== "") {
    queryArtist = albumArtist;
  } else if (artist !== "") {
    queryArtist = artist;
  }

  if (queryArtist !== "") {
    queryArtist = regroupArtists(queryArtist).split("; ")[0];
    query += ` artist:${queryArtist}`;
  }

  if (album && album !== "") {
    query += ` album:${album}`;
  }

  return query;
}

async function updatePresence(state: MediaState) {
  let name = moonlight.getConfigOption<string>("mediaControls", "richPresenceTitle") ?? "music";
  if (
    (moonlight.getConfigOption<boolean>("mediaControls", "richPresenceProvidedTitle") ?? true) &&
    state.player_name &&
    state.player_name !== ""
  ) {
    name = state.player_name.replace(".exe", "");
  }

  const playing = state.playing;
  const pausedSuffix = moonlight.getConfigOption<string>("mediaControls", "richPresencePausedSuffix") ?? "[paused]";
  if (!playing && pausedSuffix !== "") {
    name += " " + pausedSuffix;
  }

  const defaultAsset = moonlight.getConfigOption<string>("mediaControls", "richPresenceAssetDefault");
  let artwork = "unknown";

  if (moonlight.getConfigOption<boolean>("mediaControls", "richPresenceLastFm") ?? true) {
    try {
      artwork = await getArtworkFromLastFm(state.album, state.artist, state.title, state.album_artist);
    } catch (err) {
      logger.error("Failed to get artwork from last.fm:", err);
    }
  }

  if (
    (moonlight.getConfigOption<boolean>("mediaControls", "richPresenceSpotify") ?? true) &&
    spotifyAccountId &&
    spotifyToken
  ) {
    try {
      let query = buildSpotifyQuery(state.title, state.artist, state.album_artist, state.album);

      let spotifyData;
      if (spotifyCache.has(query)) {
        spotifyData = spotifyCache.get(query);
      } else {
        const data = await getSpotifyData(query);
        const track = data?.tracks?.items?.[0];
        if (track) {
          spotifyData = track;
          spotifyCache.set(query, track);
        } else {
          // retry with no album artist
          if (state.album_artist && state.album_artist !== "") {
            query = buildSpotifyQuery(state.title, state.artist, "", state.album);
            const data = await getSpotifyData(query);
            const track = data?.tracks?.items?.[0];
            if (track) {
              spotifyData = track;
              spotifyCache.set(query, track);
            }
          }

          // retry with Various Artists
          if (!spotifyData) {
            query = buildSpotifyQuery(state.title, state.artist, "Various Artists", state.album);
            const data = await getSpotifyData(query);
            const track = data?.tracks?.items?.[0];
            if (track) {
              spotifyData = track;
              spotifyCache.set(query, track);
            }
          }
        }
      }

      const cover = spotifyData?.album?.images?.[0]?.url;
      if (cover) {
        artwork = cover.replace("https://i.scdn.co/image/", "spotify:");
      }
    } catch (err) {
      logger.error("Failed to get artwork from Spotify:", err);
    }
  }

  const appId = moonlight.getConfigOption<string>("mediaControls", "richPresenceAppId") ?? DEFAULT_APP_ID;

  let artworkUrl = defaultAsset;
  if (artwork !== "unknown") {
    if (artwork.startsWith("http") && appId !== "") {
      try {
        const { body } = await HTTP.post({
          url: Endpoints.APPLICATION_EXTERNAL_ASSETS(appId),
          body: {
            urls: [artwork]
          },
          oldFormErrors: true
        });

        artworkUrl = "mp:" + body[0].external_asset_path;
      } catch (err) {
        logger.error("Failed to push external assets:", err);
      }
    } else {
      artworkUrl = artwork;
    }
  }

  // no penor
  if (state.artist === "Death Grips" && state.album && state.album === "No Love Deep Web")
    artworkUrl = "spotify:ab67616d00001e02f552daab2bc3dc64d2c4c649";

  const artistPrefix =
    (moonlight.getConfigOption<boolean>("mediaControls", "richPresenceByPrefix") ?? false) ? "by " : "";
  const MAX_ARTIST_LENGTH = 128 - artistPrefix.length;

  let artist = state.artist !== "" ? state.artist : "<unknown artist>";
  const albumArtist = state.album_artist;
  if (artist.length > MAX_ARTIST_LENGTH) {
    if (albumArtist && albumArtist !== "" && albumArtist.length <= MAX_ARTIST_LENGTH) {
      artist = albumArtist;
    } else {
      artist = artist.substring(0, MAX_ARTIST_LENGTH - 1) + "…";
    }
  } else if (
    (moonlight.getConfigOption<boolean>("mediaControls", "richPresenceAlbumArtist") ?? true) &&
    albumArtist &&
    albumArtist !== "" &&
    artist !== albumArtist
  ) {
    const combined = `${artist} // ${albumArtist}`;
    if (combined.length <= MAX_ARTIST_LENGTH) artist = combined;
  }
  artist = artistPrefix + artist;

  const albumPrefix =
    (moonlight.getConfigOption<boolean>("mediaControls", "richPresenceOnPrefix") ?? false) ? "on " : "";
  const MAX_ALBUM_LENGTH = 128 - albumPrefix.length;

  let album = state.album;
  if (album && album !== "") {
    if (album.length > MAX_ALBUM_LENGTH) {
      album = album.substring(0, MAX_ALBUM_LENGTH - 1) + "…";
    }
    album = albumPrefix + album;
  }

  let title = state.title;
  // TODO?: maybe add an option to show song length next to title
  if (title.length > 128) {
    title = title.substring(0, 127) + "…";
  }

  const activity: Activity = {
    application_id: appId,
    name,
    type: ActivityTypes.LISTENING,
    details: title,
    state: artist,
    assets: {
      large_image: artworkUrl
    }
  };

  if (album !== "") activity.assets!.large_text = album;

  const playingAsset = moonlight.getConfigOption<string>("mediaControls", "richPresenceAssetPlaying") ?? "";
  const pausedAsset = moonlight.getConfigOption<string>("mediaControls", "richPresenceAssetPaused") ?? "";
  if (
    moonlight.getConfigOption<boolean>("mediaControls", "richPresenceStateImage") &&
    playingAsset !== "" &&
    pausedAsset !== ""
  ) {
    activity.assets!.small_image = playing ? playingAsset : pausedAsset;
    activity.assets!.small_text = playing ? "Playing" : "Paused";
  }

  const position = Math.floor(state.elapsed * 1000);
  let duration = Math.floor(state.duration * 1000);
  if (duration < 0) duration = 0;
  const now = Date.now();
  const startPos = now - position;
  const endPos = now + duration - position;

  if (playing) {
    activity.timestamps = {
      start: startPos
    };
    if (duration > 0) activity.timestamps.end = endPos;
  }

  // kinda pointless since they dont render it on listening activities anymore, oh well
  if (state.track_number && state.total_tracks && state.track_number > 0) {
    let total = state.total_tracks;
    if (state.track_number > 0 && state.total_tracks === 0) total = state.track_number;

    activity.party = {
      size: [state.track_number, total]
    };
  }

  sendActivity(activity);
}

const SPOTIFY_PLAYER_NAMES = [
  "Spotify", // Spotify provider type and probably Linux
  "Spotify.exe", // Windows
  "SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify" // Windows Store
];

let running = false;
let lastState: MediaState | undefined;
async function onChange() {
  const enabled = moonlight.getConfigOption<boolean>("mediaControls", "richPresence") ?? false;

  const playerReStr = moonlight.getConfigOption<string>("mediaControls", "richPresencePlayerRegex");
  const playerRe = playerReStr ? new RegExp(playerReStr, "g") : null;
  const state = MediaControlsStore.getState();

  if ((!state || !enabled) && running) {
    sendActivity();
    running = false;
    lastState = undefined;
  } else if (state && enabled) {
    running = true;
    if (
      SPOTIFY_PLAYER_NAMES.includes(state.player_name ?? "") ||
      (playerRe !== null && !playerRe.test(state.player_name ?? ""))
    ) {
      sendActivity();
    } else if (
      !lastState ||
      lastState.artist !== state.artist ||
      lastState.title !== state.title ||
      lastState.playing !== state.playing ||
      state.elapsed < lastState.elapsed // looping track
    ) {
      lastState = state;
      await updatePresence(state);
    }
  }
}

function init() {
  MediaControlsStore.addChangeListener(onChange);
  Dispatcher.unsubscribe("CONNECTION_OPEN", init);
}
Dispatcher.subscribe("CONNECTION_OPEN", init);
