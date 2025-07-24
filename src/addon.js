const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "storage", "users.json");
function getTokens() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")); }
    catch { return {}; }
}
function saveTokens(obj) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2));
}

const manifest = {
    id: "org.stremio.trakt-assistido",
    version: "1.0.0",
    name: "HandyCard - Trakt Assistido MultiUsuário",
    description: "Exibe handy card lateral (multiusuário) com status do Trakt.",
    resources: [
        {
            name: "meta",
            types: ["movie", "episode"],
            idPrefixes: ["tt"]
        }
    ],
    types: ["movie", "series", "episode"],
    catalogs: [],
    stremioAddonsConfig: {
        issuer: "https://stremio-addons.net",
        signature: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..PykHL5Vqd5qsGMKj2R-64A.ld79LFrsCduJEplHPXA-70XlWnr4x9xAgFprRLteKtrBe0YmspxyWIvj3dJUZleoAc6B13csj798X00yhKvPq0xC1P2Daqzu4xxGuluSBlY4lG2bcB_SQGmduRwh1ScU.Zwomcu75bRIgtR-XKl9eOw"
    }
};

const builder = new addonBuilder(manifest);

builder.defineMetaHandler(async ({ type, id, extra }) => {
    let usuario = (extra && extra.user) ? extra.user : "default";
    let tokens = getTokens();
    let userTraktToken = tokens[usuario];

    let watched = false, statusText = "❌ Não Assistido.";

    if (userTraktToken) {
        let traktType = type === "movie" ? "movie" : "episode";
        let traktPath = traktType === "movie"
            ? "https://api.trakt.tv/sync/watched/movies"
            : "https://api.trakt.tv/sync/watched/episodes";
        try {
            const response = await axios.get(traktPath, {
                headers: {
                    "Content-Type": "application/json",
                    "trakt-api-version": "2",
                    "trakt-api-key": process.env.TRAKT_CLIENT_ID,
                    "Authorization": `Bearer ${userTraktToken}`
                }
            });
            for (const item of response.data) {
                if (traktType === "movie" && item.movie && item.movie.ids.imdb === id) watched = true;
                if (traktType === "episode" && item.episode && item.episode.ids.imdb === id) watched = true;
            }
        } catch (err) {}
        if (watched) statusText = "✔️ Assistido.";
    }

    return {
        meta: {
            id, type,
            name: "",
            description: "",
            videos: [
                {
                    id: "trakt-status",
                    title: statusText,
                    url: "",
                    quality: "",
                    externalUrl: "",
                    isVisited: false
                }
            ],
            streams: [
                {
                    name: "Trakt Status",
                    description: statusText,
                    url: "",
                    behaviorHints: { notWebReady: true }
                }
            ]
        }
    };
});

module.exports = builder.getInterface();
