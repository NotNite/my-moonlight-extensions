import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import {
  AuthenticationStore,
  GuildStore,
  SelectedGuildStore,
  RelationshipStore
} from "@moonlight-mod/wp/common_stores";
import type { KRunnerNatives, KRunnerSearchResult } from "../types";

interface QuickSwitcherSearchResultBase {
  score: number;
  sortable: string;
  comparator: string;
}

// since we use this in multiple places here...
interface GuildRecord {
  id: string;
  name: string;
  icon: string | null;
}

// There's also APPLICATION, LINK, and IN_APP_NAVIGATION
type QuickSwitcherSearchResult = QuickSwitcherSearchResultBase &
  (
    | {
        type: "USER";
        record: {
          id: string;
          globalName: string | null;
          username: string;
          avatar: string;
        };
      }
    | {
        type: "GUILD";
        record: GuildRecord;
      }
    | {
        type: "GROUP_DM";
        record: {
          id: string;
          name: string;
          icon: string | null;
        };
      }
    | {
        type: "TEXT_CHANNEL";
        record: {
          name: string;
          id: string;
          guild_id: string;
        };
      }
    | {
        type: "VOICE_CHANNEL";
        record: {
          name: string;
          id: string;
          guild_id: string;
        };
      }
  );

type QuickSwitcherSearchResultType = QuickSwitcherSearchResult["type"];

interface QuickSwitcherSearchConfig {
  frecencyBoosters?: boolean;
  blacklist?: Set<string>;
}

interface QuickSwitcherSearchType {
  search(input: string, unknown?: unknown): void;
  destroy(): void;
}

interface QuickSwitcherSearchConstructor {
  new (
    onResultsChange: (results: QuickSwitcherSearchResult[], input: string) => void,
    resultTypes: QuickSwitcherSearchResultType[],
    limit?: number,
    searchConfig?: QuickSwitcherSearchConfig
  ): QuickSwitcherSearchType;
}

const QuickSwitcherSearch: QuickSwitcherSearchConstructor = spacepack.findByCode("queryVoiceChannels")[0].exports.Z;
const selectResult = spacepack.findFunctionByStrings(
  spacepack.findByCode(':"QUICKSWITCHER_SELECT"')[0].exports,
  "navigationReplace:"
) as (result: QuickSwitcherSearchResult) => void;

function search(input: string) {
  return new Promise<QuickSwitcherSearchResult[]>((resolve) => {
    let results: QuickSwitcherSearchResult[] | null = null;
    let timeout: NodeJS.Timeout | undefined;

    // Since `onResultsChange` gets called in batches, we'll resolve when there hasn't been any updates in a while
    function queueResolve() {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(
        () => {
          searcher.destroy();
          resolve(results ?? []);
        },
        moonlight.getConfigOption<number>("krunner", "resolverDelay")
      );
    }

    // basically a reimplementation of what QuickSwitcherStore does
    const blacklist = new Set(["user:" + AuthenticationStore.getId()]);
    const guildId = SelectedGuildStore.getGuildId();
    if (guildId) blacklist.add("guild:" + guildId);

    const searcher = new QuickSwitcherSearch(
      (newResults) => {
        // The store does some more advanced checks but this is simple enough
        if (results == null || newResults.length !== results.length) {
          results = newResults;
          queueResolve();
        }
      },
      ["USER", "GUILD", "GROUP_DM", "TEXT_CHANNEL" /*"VOICE_CHANNEL"*/],
      5,
      {
        frecencyBoosters: true,
        blacklist
      }
    );

    searcher.search(input);
  });
}

const natives: KRunnerNatives = moonlight.getNatives("krunner");

// Keep the last sent results around so we can use the record when invoked
let lastResults: {
  nonce: string;
  results: QuickSwitcherSearchResult[];
} | null = null;

function handleResults(search: string, results: QuickSwitcherSearchResult[]) {
  const nonce = Date.now().toString();

  const iconFormat = "png";
  const iconSize = 20;

  const mapped: KRunnerSearchResult[] = [];

  //const maxScore = Math.max(...results.map((r) => r.score));
  const maxScore = 15000;

  for (let i = 0; i < results.length; i++) {
    const id = `${nonce}-${i}`;
    const result = results[i];

    const base = {
      id,
      score: result.score / maxScore,
      // this sucks lol
      category_relevance: result.comparator.toLowerCase().trim() === search.toLowerCase().trim() ? 100 : 70
    };

    switch (result.type) {
      case "USER": {
        const name = (RelationshipStore.getNickname(result.record.id) as string | null) ?? result.record.globalName;

        mapped.push({
          type: "User",
          title: name ?? result.record.username,
          subtitle: name ? result.record.username : undefined,
          icon: `https://cdn.discordapp.com/avatars/${result.record.id}/${result.record.avatar}.${iconFormat}?size=${iconSize}`,
          ...base
        });
        break;
      }

      case "GUILD": {
        mapped.push({
          type: "Guild",
          title: result.record.name,
          icon: result.record.icon
            ? `https://cdn.discordapp.com/icons/${result.record.id}/${result.record.icon}.${iconFormat}?size=${iconSize}`
            : undefined,
          ...base
        });
        break;
      }

      case "GROUP_DM": {
        mapped.push({
          type: "GroupDM",
          title: result.record.name === "" ? result.comparator : result.record.name,
          icon: result.record.icon
            ? `https://cdn.discordapp.com/channel-icons/${result.record.id}/${result.record.icon}.${iconFormat}?size=${iconSize}`
            : undefined,
          ...base
        });
        break;
      }

      case "TEXT_CHANNEL": {
        const guild: GuildRecord | null = GuildStore.getGuild(result.record.guild_id);

        mapped.push({
          type: "TextChannel",
          title: result.record.name,
          subtitle: guild?.name,
          icon: guild?.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${iconFormat}?size=${iconSize}`
            : undefined,
          ...base
        });
        break;
      }

      case "VOICE_CHANNEL": {
        const guild: GuildRecord | null = GuildStore.getGuild(result.record.guild_id);

        mapped.push({
          type: "VoiceChannel",
          title: result.record.name,
          subtitle: guild?.name,
          icon: guild?.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${iconFormat}?size=${iconSize}`
            : undefined,
          ...base
        });
        break;
      }
    }
  }

  lastResults = {
    nonce,
    results
  };

  natives?.sendResults(mapped);
}

let nextSearch: NodeJS.Timeout | null = null;
function searchWithDebounce(query: string) {
  if (nextSearch) {
    clearInterval(nextSearch);
    nextSearch = null;

    // lol
    natives?.sendResults([]);
  }

  nextSearch = setTimeout(
    () => {
      nextSearch = null;
      search(query).then((results) => handleResults(query, results));
    },
    moonlight.getConfigOption<number>("krunner", "resolverDebounce")
  );
}

natives?.registerCallback((req) => {
  switch (req.type) {
    case "Search": {
      searchWithDebounce(req.query);
      break;
    }

    case "Run": {
      if (!lastResults) break;

      const [nonce, idxStr] = req.id.split("-");
      if (lastResults.nonce !== nonce) break;

      const idx = parseInt(idxStr);
      if (isNaN(idx) || idx < 0 || idx >= lastResults.results.length) break;

      const result = lastResults.results[idx];
      selectResult(result);

      lastResults = null;
      break;
    }
  }
});
