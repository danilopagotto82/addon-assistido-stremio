require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { AuthorizationCode } = require('simple-oauth2');

const app = express();
app.use(cors());

const traktClient = {
    client: {
        id: process.env.TRAKT_CLIENT_ID,
        secret: process.env.TRAKT_CLIENT_SECRET
    },
    auth: {
        tokenHost: 'https://api.trakt.tv',
        authorizePath: '/oauth/authorize',
        tokenPath: '/oauth/token'
    }
};
const redirectUri = process.env.TRAKT_REDIRECT_URI;
const oauth2 = new AuthorizationCode(traktClient);
let userTraktToken = null;

const manifest = {
    "id": "org.stremio.trakt-assistido-" + Date.now(),
    "version": "1.0.0",
    "name": "HandyCard - Trakt Assistido",
    "description": "Exibe handy card lateral com status de assistido do Trakt.",
    "resources": [
        {
            "name": "meta",
            "types": ["movie", "episode"],
            "idPrefixes": ["tt"]
        }
    ],
    "types": ["movie", "series", "episode"],
    "catalogs": []
};

function log(msg, ...args) {
    console.log(`[${new Date().toISOString()}] ${msg}`, ...args);
}

app.get('/manifest.json', (req, res) => {
    log("GET /manifest.json");
    res.json(manifest);
});

app.get('/', (req, res) => {
    log("GET /");
    res.send('Addon Stremio HandyCard - Trakt Assistido rodando!');
});

app.get('/auth/login', (req, res) => {
    log("GET /auth/login");
    const authorizationUri = oauth2.authorizeURL({
        redirect_uri: redirectUri,
        response_type: 'code'
    });
    res.redirect(authorizationUri);
});
app.get('/auth/callback', async (req, res) => {
    log("GET /auth/callback");
    const code = req.query.code;
    if (!code) {
        log("ERRO: callback sem code");
        res.status(400).send('Faltando código de autorização!');
        return;
    }
    try {
        const accessToken = await oauth2.getToken({ code, redirect_uri: redirectUri });
        userTraktToken = accessToken.token.access_token;
        log("LOGIN OK - token gravado.");
        res.send('<h2>Login feito com sucesso no Trakt!</h2><p>Você já pode usar o addon normalmente.</p>');
    } catch (err) {
        log("ERRO ao autenticar Trakt:", err);
        res.status(500).send(`Erro ao autenticar no Trakt: ${err.message}`);
    }
});

app.get('/meta/:type/:id', async (req, res) => {
    log("INICIO /meta/:type/:id", req.params);
    let { type } = req.params;
    let id = req.params.id;
    if (id.endsWith('.json')) id = id.replace(/\.json$/, '');

    log("Processando /meta", { type, id });

    let traktType;
    if (type === "movie") traktType = "movie";
    else if (type === "episode") traktType = "episode";
    else {
        log("Requisição com type inválido:", type);
        res.status(400).json({ error: "Só 'movie' ou 'episode'" });
        return;
    }

    let watched = false;

    if (userTraktToken) {
        let traktPath = traktType === "movie"
            ? "https://api.trakt.tv/sync/watched/movies"
            : "https://api.trakt.tv/sync/watched/episodes";
        try {
            log("Buscando info assistido no Trakt:", traktPath);
            const response = await axios.get(traktPath, {
                headers: {
                    'Content-Type': 'application/json',
                    'trakt-api-version': '2',
                    'trakt-api-key': process.env.TRAKT_CLIENT_ID,
                    'Authorization': `Bearer ${userTraktToken}`
                }
            });
            for (const item of response.data) {
                if (traktType === "movie" && item.movie && item.movie.ids.imdb === id) watched = true;
                if (traktType === "episode" && item.episode && item.episode.ids.imdb === id) watched = true;
            }
            log("Assistido? ", watched);
        } catch (err) {
            log("ERRO ao buscar do Trakt:", err.message);
        }
    } else {
        log("Sem token Trakt - não autenticado.");
    }

    const statusText = watched ? "✔️ Assistido." : "❌ Não Assistido.";

    // HandCard no estilo Ratings Aggregator: vídeos + streams
    log("Retornando HANDY meta (Campo videos + streams)", {id, type, statusText});

    res.json({
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
    });
});

const port = process.env.PORT || 7000;
app.listen(port, () => {
    log(`Servidor rodando em http://localhost:${port}/`);
    log(`Manifest: http://localhost:${port}/manifest.json`);
});
