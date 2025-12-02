import axios from 'axios';
import { GameRepository, ConfigRepository } from '../db/repositories/index.js';

/**
 * IGDB Service - Handles integration with IGDB API
 */
class IgdbService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        this.baseUrl = 'https://api.igdb.com/v4';
    }

    /**
     * Get OAuth token from Twitch
     */
    async getAccessToken() {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiresAt) {
            return this.accessToken;
        }

        const clientId = process.env.TWITCH_CLIENT_ID;
        const clientSecret = process.env.TWITCH_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.warn('[IGDB] ⚠️ TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not found in .env');
            return null;
        }

        try {
            console.log('[IGDB] 🔑 Authenticating with Twitch...');
            const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
                params: {
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'client_credentials'
                }
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiresAt = now + (response.data.expires_in * 1000) - 60000; // Buffer of 1 min
            console.log('[IGDB] ✅ Authentication successful');
            return this.accessToken;
        } catch (error) {
            console.error('[IGDB] ❌ Authentication failed:', error.message);
            return null;
        }
    }

    /**
     * Search games in IGDB
     */
    async searchGames(query) {
        const token = await this.getAccessToken();
        if (!token) return [];

        try {
            const response = await axios.post(
                `${this.baseUrl}/games`,
                `search "${query}"; 
                 fields name, cover.url, first_release_date, platforms.name, aggregated_rating, summary, genres.name, slug; 
                 limit 20;`,
                {
                    headers: {
                        'Client-ID': process.env.TWITCH_CLIENT_ID,
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return response.data.map(this.mapIgdbGame);
        } catch (error) {
            console.error('[IGDB] ❌ Search failed:', error.message);
            return [];
        }
    }

    /**
     * Get top popular games
     */
    async getTopGames(limit = 100, offset = 0) {
        const token = await this.getAccessToken();
        if (!token) return [];

        try {
            // Fetch games sorted by rating/popularity
            // We filter for games that have a rating and cover to ensure quality
            const response = await axios.post(
                `${this.baseUrl}/games`,
                `fields name, cover.url, first_release_date, platforms.name, aggregated_rating, summary, genres.name, slug, total_rating_count;
                 where aggregated_rating > 50 & cover != null & platforms != null & total_rating_count > 5;
                 sort aggregated_rating desc;
                 limit ${limit};
                 offset ${offset};`,
                {
                    headers: {
                        'Client-ID': process.env.TWITCH_CLIENT_ID,
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return response.data.map(this.mapIgdbGame);
        } catch (error) {
            console.error('[IGDB] ❌ Fetch top games failed:', error.message);
            return [];
        }
    }

    /**
     * Get Twitch User Info
     */
    async getUserInfo(username) {
        const token = await this.getAccessToken();
        if (!token) return null;

        try {
            const response = await axios.get('https://api.twitch.tv/helix/users', {
                params: { login: username },
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.data && response.data.data.length > 0) {
                return response.data.data[0];
            }
            return null;
        } catch (error) {
            console.error('[IGDB] ❌ Fetch user info failed:', error.message);
            return null;
        }
    }

    /**
     * Map IGDB response to internal format
     */
    mapIgdbGame(igdbGame) {
        let coverUrl = igdbGame.cover ? igdbGame.cover.url : null;
        if (coverUrl && coverUrl.startsWith('//')) {
            coverUrl = 'https:' + coverUrl;
        }
        // Replace thumb with cover_big for better quality
        if (coverUrl) {
            coverUrl = coverUrl.replace('t_thumb', 't_cover_big');
        }

        return {
            id: igdbGame.id,
            name: igdbGame.name,
            slug: igdbGame.slug,
            summary: igdbGame.summary,
            aggregated_rating: igdbGame.aggregated_rating,
            first_release_date: igdbGame.first_release_date,
            platforms: igdbGame.platforms,
            genres: igdbGame.genres,
            cover: { url: coverUrl }
        };
    }

    /**
     * Sync games from IGDB to local database
     */
    async syncGames() {
        console.log('[IGDB SYNC] 🔄 Starting automatic game sync...');

        const token = await this.getAccessToken();
        if (!token) {
            console.log('[IGDB SYNC] ⚠️ Skipping sync: No credentials');
            return { success: false, error: 'No credentials' };
        }

        try {
            // Fetch 1000 top games in batches of 100 (IGDB limit per request)
            const batches = [];
            for (let i = 0; i < 10; i++) {
                const offset = i * 100;
                console.log(`[IGDB SYNC] Fetching batch ${i + 1}/10 (offset: ${offset})...`);
                const batch = await this.getTopGames(100, offset);
                batches.push(...batch);
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            const igdbGames = batches;
            console.log(`[IGDB SYNC] Fetched ${igdbGames.length} games from IGDB`);

            let addedCount = 0;
            let updatedCount = 0;

            for (const igdbGame of igdbGames) {
                const gameData = {
                    igdbId: igdbGame.id,
                    igdbSlug: igdbGame.slug,
                    name: igdbGame.name,
                    console: igdbGame.platforms ? igdbGame.platforms.map(p => p.name).join(', ') : 'N/A',
                    releaseYear: igdbGame.first_release_date
                        ? new Date(igdbGame.first_release_date * 1000).getFullYear()
                        : null,
                    originalRating: igdbGame.aggregated_rating || null,
                    cover: igdbGame.cover ? igdbGame.cover.url : null,
                    genres: igdbGame.genres ? igdbGame.genres.map(g => g.name) : [],
                    // Use aggregated_rating as metacriticScore for rarity calculation
                    metacriticScore: igdbGame.aggregated_rating || null,
                    description: igdbGame.summary || ''
                };

                // upsertGame handles rarity calculation from metacriticScore
                const result = await GameRepository.upsertGame(gameData);

                // Check if it was a new document (createdAt approx equals updatedAt)
                // This is a rough check, but upsertGame doesn't return status
                // We can assume it worked.
                updatedCount++;
            }

            const total = await GameRepository.getCount();
            console.log(`[IGDB SYNC] ✅ Sync complete! Total games in DB: ${total}`);

            return { success: true, total, count: igdbGames.length };
        } catch (error) {
            console.error('[IGDB SYNC] ❌ Sync failed:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new IgdbService();
