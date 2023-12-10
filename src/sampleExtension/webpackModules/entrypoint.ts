// You can use Webpack's require() function to load other Webpack modules.
// Imports starting with `@moonlight-mod/wp` are transformed into Webpack requires.
// These must be typed (see env.d.ts).

// It is suggested to only use require/import for other extensions' modules,
// and then use a library like Spacepack to locate Discord's modules
// (as module IDs can change).
import someLibrary from "@moonlight-mod/wp/sampleExtension_someLibrary";
console.log("someLibrary exports:", someLibrary);

const natives = moonlight.getNatives("sampleExtension");
console.log("node exports:", natives);
