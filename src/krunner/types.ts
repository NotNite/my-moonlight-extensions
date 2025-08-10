export type KRunnerRequest =
  | {
      type: "Search";
      query: string;
    }
  | {
      type: "Run";
      id: string;
    };

export type KRunnerSearchResult = {
  type: "User" | "Guild" | "GroupDM" | "TextChannel" | "VoiceChannel";
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  score: number;
  category_relevance: number;
};

export type KRunnerRequestCallback = (request: KRunnerRequest) => void;

export interface KRunnerNatives {
  registerCallback(search: KRunnerRequestCallback): void;
  sendResults(results: KRunnerSearchResult[]): void;
}
