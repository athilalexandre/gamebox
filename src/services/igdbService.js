import fetch from 'node-fetch';
import { loadConfig } from '../utils/storage.js';

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    const config = loadConfig();
    const { igdbClientId, igdbClientSecret } = config;

    if (!igdbClientId || !igdbClientSecret) {
        throw new Error('Credenciais do IGDB não configuradas.');
    }

    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const url = `https://id.twitch.tv/oauth2/token?client_id=${igdbClientId}&client_secret=${igdbClientSecret}&grant_type=client_credentials`;

    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();

    if (data.access_token) {
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);
        return accessToken;
    } else {
        throw new Error('Falha ao obter token do IGDB: ' + JSON.stringify(data));
    }
}

export async function searchGames(query) {
    try {
        const token = await getAccessToken();
        const config = loadConfig();

        // Busca com aggregated_rating (Metacritic) para melhor precisão
        const body = `search "${query}"; fields name, cover.url, platforms.name, first_release_date, aggregated_rating, summary; limit 10;`;

        const res = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Client-ID': config.igdbClientId,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain'
            },
            body: body
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Erro na API do IGDB (${res.status}): ${errText}`);
        }

        return await res.json();
    } catch (error) {
        console.error('IGDB Service Error:', error);
        throw error;
    }
}

export async function getTopGames() {
    try {
        const token = await getAccessToken();
        const config = loadConfig();

        // Busca jogos com aggregated_rating (Metacritic-based) para distribuição precisa
        // Ordenado por aggregated_rating para garantir que os melhores jogos fiquem no topo
        const body = `fields name, cover.url, platforms.name, first_release_date, aggregated_rating, summary; sort aggregated_rating desc; where aggregated_rating_count > 5 & aggregated_rating != null & parent_game = null & version_parent = null; limit 500;`;

        const res = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Client-ID': config.igdbClientId,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain'
            },
            body: body
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Erro na API do IGDB (${res.status}): ${errText}`);
        }

        return await res.json();
    } catch (error) {
        console.error('IGDB Service Error:', error);
        throw error;
    }
}
