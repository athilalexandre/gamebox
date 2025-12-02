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
        this.currentClientId = null; // Store the Client ID used for the current token
    }

    /**
     * Get OAuth token from Twitch
     */
    async getAccessToken() {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiresAt) {
            return this.accessToken;
        }

        // Try to get from DB first (Dashboard settings), then .env
        let clientId = process.env.TWITCH_CLIENT_ID;
        let clientSecret = process.env.TWITCH_CLIENT_SECRET;

        try {
            const config = await ConfigRepository.getConfig();
            if (config) {
                if (config.igdbClientId) clientId = config.igdbClientId;
                if (config.igdbClientSecret) clientSecret = config.igdbClientSecret;
            }
        } catch (err) {
            console.warn('[IGDB] Failed to load config from DB, using env vars:', err.message);
        }

        if (!clientId || !clientSecret) {
            console.warn('[IGDB] ⚠️ Client ID or Secret not found (checked DB and .env)');
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
            this.currentClientId = clientId; // Store for subsequent requests

            console.log('[IGDB] ✅ Authentication successful');
            return this.accessToken;
        } catch (error) {
            console.error('[IGDB] ❌ Authentication failed:', error.response?.data || error.message);
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
                        'Client-ID': this.currentClientId || process.env.TWITCH_CLIENT_ID,
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
                        'Client-ID': this.currentClientId || process.env.TWITCH_CLIENT_ID,
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
    /**
     * Sync games from IGDB to local database
     * @param {number} totalLimit Total number of games to fetch (default 2000)
     * @param {number} startOffset Offset to start fetching from (default 0)
     */
    async syncGames(totalLimit = 2000, startOffset = 0) {
        console.log(`[IGDB SYNC] 🔄 Starting automatic game sync (Limit: ${totalLimit}, Offset: ${startOffset})...`);

        const token = await this.getAccessToken();
        if (!token) {
            console.log('[IGDB SYNC] ⚠️ Skipping sync: No credentials');
            return { success: false, error: 'No credentials' };
        }

        try {
            // Fetch in batches of 100 (IGDB limit per request)
            const batchSize = 100;
            const numBatches = Math.ceil(totalLimit / batchSize);
            const batches = [];

            for (let i = 0; i < numBatches; i++) {
                const offset = startOffset + (i * batchSize);
                console.log(`[IGDB SYNC] Fetching batch ${i + 1}/${numBatches} (offset: ${offset})...`);

                try {
                    const batch = await this.getTopGames(batchSize, offset);
                    if (batch && batch.length > 0) {
                        batches.push(...batch);
                    } else {
                        console.log('[IGDB SYNC] No more games returned from IGDB.');
                        break;
                    }
                } catch (err) {
                    console.error(`[IGDB SYNC] Error fetching batch ${i + 1}:`, err.message);
                    // Continue to next batch or break? Let's continue to try to get as much as possible
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 250));
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
    /**
     * Sync ALL games from IGDB to local database
     * @param {Function} onProgress Callback for progress updates (count, total)
     */
    async syncAllGames(onProgress) {
        console.log('[IGDB SYNC] 🔄 Starting FULL game sync (ALL ~350k+ games)...');

        const token = await this.getAccessToken();
        if (!token) {
            return { success: false, error: 'No credentials' };
        }

        try {
            let offset = 0;
            let totalFetched = 0;
            const batchSize = 500; // IGDB max
            let hasMore = true;
            let consecutiveErrors = 0;
            const MAX_CONSECUTIVE_ERRORS = 5;

            while (hasMore) {
                console.log(`[IGDB SYNC] Fetching batch at offset ${offset}...`);

                try {
                    // Fetch ALL games - removed category filter to get all ~350k+ games
                    const response = await axios.post(
                        `${this.baseUrl}/games`,
                        `fields name, cover.url, first_release_date, platforms.name, aggregated_rating, summary, genres.name, slug, total_rating_count;
                         sort id asc;
                         limit ${batchSize};
                         offset ${offset};`,
                        {
                            headers: {
                                'Client-ID': this.currentClientId || process.env.TWITCH_CLIENT_ID,
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );

                    const batch = response.data.map(this.mapIgdbGame);

                    console.log(`[IGDB SYNC] Received ${batch.length} games in this batch`);

                    if (batch && batch.length > 0) {
                        // Process batch
                        for (const igdbGame of batch) {
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
                                // Use aggregated_rating as Metacritic placeholder
                                metacriticScore: igdbGame.aggregated_rating ? Math.round(igdbGame.aggregated_rating) : null,
                                description: igdbGame.summary || ''
                            };

                            await GameRepository.upsertGame(gameData);
                        }

                        totalFetched += batch.length;
                        offset += batch.length;

                        // Report progress
                        if (onProgress) {
                            onProgress({
                                fetched: totalFetched,
                                currentOffset: offset,
                                lastGame: batch[batch.length - 1].name
                            });
                        }

                        // If we got less than requested, we are done
                        if (batch.length < batchSize) {
                            console.log(`[IGDB SYNC] Reached end of IGDB database. Last batch had ${batch.length} games (expected ${batchSize}).`);
                            hasMore = false;
                        }

                        // Reset error counter on success
                        consecutiveErrors = 0;

                        // Rate limiting protection (4 req/s limit = 250ms between requests)
                        await new Promise(resolve => setTimeout(resolve, 300));

                    } else {
                        hasMore = false;
                    }
                } catch (err) {
                    consecutiveErrors++;
                    console.error(`[IGDB SYNC] Error at offset ${offset}:`, err.message);

                    // If too many consecutive errors, abort
                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        console.error(`[IGDB SYNC] ❌ Too many consecutive errors. Aborting.`);
                        return {
                            success: false,
                            error: `Aborted after ${MAX_CONSECUTIVE_ERRORS} consecutive errors`,
                            fetchedBeforeError: totalFetched
                        };
                    }

                    // Skip this batch and try next
                    offset += batchSize;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Longer wait on error
                }
            }

            const total = await GameRepository.getCount();
            console.log(`[IGDB SYNC] ✅ Full sync complete! Total games in DB: ${total}`);

            return { success: true, total, count: totalFetched };

        } catch (error) {
            console.error('[IGDB SYNC] ❌ Sync failed:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new IgdbService();
