const express = require("express");
const { getRouter } = require("stremio-addon-sdk");
const path = require("path");
const fs = require("fs");
const addonInterface = require("./addon");
require("dotenv").config();

const USERS_FILE = path.join(__dirname, "storage", "users.json");
function getTokens() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")); }
    catch { return {}; }
}
function saveTokens(obj) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2));
}

const app = express();

// Log de cada requisição recebida, útil para debug:
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Corrige: aceita meta sem e com .json na rota
app.get('/meta/:type/:id', (req, res, next) => {
    // Deixa o Stremio SDK tratar via getRouter
    next();
});
app.get('/meta/:type/:id.json', (req, res, next) => {
    req.url = req.url.replace(/\.json$/, '');
    next();
});

// Use o router do addon depois do ajuste acima
app.use("/", getRouter(addonInterface));

// Página config multiusuário
app.get("/config", (req, res) => {
    res.render("config", { users: getTokens() });
});

// Autenticação Trakt
app.get('/auth/login', (req, res) => {
    let user = req.query.user || 'default';
    const { AuthorizationCode } = require("simple-oauth2");
    const client = new AuthorizationCode({
        client: {
            id: process.env.TRAKT_CLIENT_ID,
            secret: process.env.TRAKT_CLIENT_SECRET
        },
        auth: {
            tokenHost: 'https://api.trakt.tv',
            authorizePath: '/oauth/authorize',
            tokenPath: '/oauth/token'
        }
    });
    const authorizationUri = client.authorizeURL({
        redirect_uri: process.env.TRAKT_REDIRECT_URI,
        response_type: 'code',
        state: user
    });
    res.redirect(authorizationUri);
});

app.get('/auth/callback', async (req, res) => {
    const { AuthorizationCode } = require("simple-oauth2");
    const code = req.query.code;
    const user = req.query.state || 'default';
    const client = new AuthorizationCode({
        client: {
            id: process.env.TRAKT_CLIENT_ID,
            secret: process.env.TRAKT_CLIENT_SECRET
        },
        auth: {
            tokenHost: 'https://api.trakt.tv',
            authorizePath: '/oauth/authorize',
            tokenPath: '/oauth/token'
        }
    });
    try {
        const token = await client.getToken({
            code,
            redirect_uri: process.env.TRAKT_REDIRECT_URI
        });
        let tokens = getTokens();
        tokens[user] = token.token.access_token;
        saveTokens(tokens);
        res.send(`<h2>Login feito com sucesso<br/>Usuário: ${user}</h2><a href="/config">Voltar</a>`);
    } catch (e) {
        res.send(`<h2>Erro de autenticação Trakt</h2><pre>${e}</pre>`);
    }
});

// Logout de usuário
app.get('/logout/:user', (req, res) => {
    let tokens = getTokens();
    delete tokens[req.params.user];
    saveTokens(tokens);
    res.redirect("/config");
});

// Porta do Railway
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`[STREMIO SDK] Rodando em http://localhost:${port}/`);
});
