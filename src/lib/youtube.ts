import { YoutubeTranscript } from 'youtube-transcript';

export async function getYoutubeTranscript(url: string) {
    let videoId = extractVideoID(url);

    // Fallback: If no video ID found, check if it's a channel URL and get the latest video
    if (!videoId) {
        try {
            // Rough check to see if it looks like a YouTube URL or handle
            if (url.includes('youtube.com') || url.includes('youtu.be') || url.startsWith('@')) {
                console.log(`[YouTube] No video ID found. Attempting to resolve channel: ${url}`);
                const { videos } = await getChannelVideos(url);
                if (videos && videos.length > 0) {
                    videoId = videos[0].id; // Use the latest video
                    console.log(`[YouTube] Resolved channel to latest video: "${videos[0].title}" (${videoId})`);
                }
            }
        } catch (e) {
            console.warn(`[YouTube] Failed to resolve channel from URL ${url}`, e);
        }
    }

    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    let title = "";
    let content = "";
    let isFallback = false;

    // 1. Try to fetch Transcript
    try {
        console.log(`[YouTube] Attempting transcript fetch for ${videoId}`);
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error('Transcript is empty');
        }

        content = transcriptItems.map(item => item.text).join(' ');
        console.log(`[YouTube] Transcript found (${content.length} characters)`);

        try {
            const noembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (noembed.ok) {
                const data = await noembed.json();
                title = data.title;
            }
        } catch (e) {
            console.warn("Retrying title fetch via oEmbed failed", e);
        }

    } catch (error: any) {
        console.warn(`[YouTube] Transcript fetch failed for ${videoId}:`, error.message || error);

        // 2. Fallback: Fetch Title & Description via Data API
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            throw new Error('Transcript failed and YOUTUBE_API_KEY is missing for fallback.');
        }

        try {
            console.log(`[YouTube] Attempting fallback with Data API for ${videoId}`);
            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
            const res = await fetch(apiUrl);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('[YouTube] Data API error details:', errorData);
                throw new Error(`Data API failed with status ${res.status}: ${JSON.stringify(errorData)}`);
            }

            const data = await res.json();
            if (!data.items || data.items.length === 0) {
                throw new Error('Video not found in Data API');
            }

            const snippet = data.items[0].snippet;
            title = snippet.title;
            const description = snippet.description || "(No description)";

            content = `※字幕データがないため、概要欄から要約しました。\n\n【動画タイトル】\n${title}\n\n【概要欄】\n${description}`;
            console.log(`[YouTube] Fallback content generated (${content.length} characters)`);
            isFallback = true;

        } catch (apiError: any) {
            console.error(`[YouTube] Both Transcript and Data API failed:`, apiError);
            throw new Error(`Could not fetch video content: ${apiError.message}`);
        }
    }

    if (!title) title = "YouTube Video"; // Fallback title

    const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    return {
        title,
        content,
        thumbnail,
        type: 'youtube'
    };
}

function extractVideoID(url: string) {
    // Robust regex with fewer groups to avoid index confusion
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : false;
}

// --- Channel Monitor Feature ---

export interface ChannelVideo {
    id: string;
    title: string;
    thumbnail: string;
    publishedAt: string;
    url: string;
}

export async function getChannelVideos(channelInput: string, sortBy: 'date' | 'viewCount' = 'date'): Promise<{ channelName: string; videos: ChannelVideo[] }> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY is not configured');
    }

    // 1. Resolve Channel ID and Uploads Playlist ID
    let apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&key=${apiKey}`;

    const { type, value } = extractChannelIdentity(channelInput);

    if (type === 'handle') {
        apiUrl += `&forHandle=${encodeURIComponent(value)}`;
    } else {
        apiUrl += `&id=${encodeURIComponent(value)}`;
    }

    const channelRes = await fetch(apiUrl);
    if (!channelRes.ok) {
        throw new Error('Failed to fetch channel info from YouTube API');
    }
    const channelData = await channelRes.json();

    if (!channelData.items || channelData.items.length === 0) {
        throw new Error('Channel not found');
    }

    const channelItem = channelData.items[0];
    const uploadsPlaylistId = channelItem.contentDetails?.relatedPlaylists?.uploads;
    const channelName = channelItem.snippet?.title || channelInput;
    const channelId = channelItem.id;

    if (!uploadsPlaylistId) {
        throw new Error('No uploads playlist found for this channel');
    }

    // 2. Fetch videos based on sort order
    let videos: ChannelVideo[] = [];

    if (sortBy === 'viewCount') {
        // Fetch popular videos using Search API
        // Fetch more results (50) to allow for filtering out Shorts
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&maxResults=50&type=video&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);

        if (!searchRes.ok) {
            const errorData = await searchRes.json().catch(() => ({}));
            throw new Error(`Failed to fetch popular videos: ${JSON.stringify(errorData)}`);
        }
        const searchData = await searchRes.json();
        const rawItems = searchData.items || [];

        if (rawItems.length > 0) {
            // Get contentDetails to check duration (filter out Shorts)
            const videoIds = rawItems.map((item: any) => item.id.videoId).join(',');
            const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
            const detailsRes = await fetch(videoDetailsUrl);

            if (detailsRes.ok) {
                const detailsData = await detailsRes.json();
                const detailsMap = new Map();
                (detailsData.items || []).forEach((item: any) => {
                    detailsMap.set(item.id, item);
                });

                // Filter items
                const filteredItems = rawItems.filter((item: any) => {
                    const detail = detailsMap.get(item.id.videoId);
                    if (!detail) return false;

                    const duration = detail.contentDetails?.duration; // ISO 8601 (e.g. PT1M, PT59S)

                    // Simple logic: If duration has no 'H' and no 'M', it is < 60s => Short.
                    // This assumes standard Shorts are < 60s.
                    if (!duration) return false;
                    const isShort = !duration.includes('H') && !duration.includes('M');

                    return !isShort;
                });

                // Take top 10 of filtered
                videos = filteredItems.slice(0, 10).map((item: any) => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                    publishedAt: item.snippet.publishedAt,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                }));
            } else {
                // If details fetch fails, fallback to raw items (slice 10)
                console.warn('Failed to fetch video details for duration check, returning raw search results.');
                videos = rawItems.slice(0, 10).map((item: any) => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                    publishedAt: item.snippet.publishedAt,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                }));
            }
        }
    } else {
        // Fetch recent videos from Uploads Playlist
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`;
        const playlistRes = await fetch(playlistUrl);

        if (!playlistRes.ok) {
            throw new Error('Failed to fetch videos from YouTube API');
        }
        const playlistData = await playlistRes.json();

        videos = (playlistData.items || []).map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        }));
    }

    return { channelName, videos };
}

// --- Search Feature ---

export async function searchVideos(query: string, publishedAfter: string, maxResults: number = 10, isGlobal: boolean = false): Promise<ChannelVideo[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY is not configured');
    }

    // Increase fetch count to allow for client-side filtering
    const fetchCount = !isGlobal ? 50 : maxResults;

    // For Domestic with English Query: Append OR condition for common Japanese keywords
    // This forces YouTube to retrieve Japanese videos even for English queries like "Gemini" or "Antigravity"
    const asciiRegex = /^[\x00-\x7F]*$/;
    let effectiveQuery = query;
    if (!isGlobal && asciiRegex.test(query)) {
        effectiveQuery = `${query} (解説|日本語|まとめ|レビュー)`;
    }

    let apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(effectiveQuery)}&type=video&order=viewCount&publishedAfter=${encodeURIComponent(publishedAfter)}&maxResults=${fetchCount}`;

    if (!isGlobal) {
        apiUrl += `&relevanceLanguage=ja`;
    }

    apiUrl += `&key=${apiKey}`;

    const res = await fetch(apiUrl);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`YouTube Search API failed: ${JSON.stringify(errorData)}`);
    }

    const data = await res.json();
    let items = data.items || [];

    // Valid Request: Strictly filter for Japanese content if not global
    if (!isGlobal) {
        const japaneseRegex = /[ぁ-んァ-ン一-龠]/;
        // 1. Initial Filter: Remove items with no Japanese in Title/Channel (fast filter)
        items = items.filter((item: any) => {
            const title = item.snippet.title || "";
            const channelTitle = item.snippet.channelTitle || "";
            return japaneseRegex.test(title) || japaneseRegex.test(channelTitle);
        });

        // 2. Strict Filter: Check Channel Country via Channels API (slow but accurate filter)
        // This prevents foreign channels with auto-translated titles from appearing.
        if (items.length > 0) {
            const channelIds = Array.from(new Set(items.map((item: any) => item.snippet.channelId))).slice(0, 50);
            const channelsApiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds.join(',')}&key=${apiKey}`;

            try {
                const channelRes = await fetch(channelsApiUrl);
                if (channelRes.ok) {
                    const channelData = await channelRes.json();
                    const countryMap = new Map();
                    (channelData.items || []).forEach((ch: any) => {
                        countryMap.set(ch.id, ch.snippet.country);
                    });

                    // Filter out known foreign countries. Allow 'JP' and undefined (unset).
                    items = items.filter((item: any) => {
                        const country = countryMap.get(item.snippet.channelId);
                        // If country is explicitly defined and NOT JP, reject.
                        // (Allows undefined to pass, assuming Regex caught the Japanese context)
                        if (country && country !== 'JP') {
                            return false;
                        }
                        return true;
                    });
                }
            } catch (e) {
                console.warn("Channel country check failed, falling back to regex only", e);
            }
        }
    }

    return items.slice(0, maxResults).map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
}

function extractChannelIdentity(input: string): { type: 'handle' | 'id', value: string } {
    const cleanInput = input.trim();

    // Check if it's a URL
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
        try {
            const urlObj = new URL(cleanInput);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);

            // Handle /channel/ID
            if (pathSegments[0] === 'channel' && pathSegments[1]) {
                return { type: 'id', value: pathSegments[1] };
            }

            // Handle /@handle
            const handleSegment = pathSegments.find(s => s.startsWith('@') || s.startsWith('%40'));
            if (handleSegment) {
                return { type: 'handle', value: decodeURIComponent(handleSegment) };
            }

        } catch (e) {
            console.warn("Invalid URL in extractChannelIdentity, falling back to raw input:", input);
        }
    }

    // Check if it looks like a handle directly
    if (cleanInput.startsWith('@')) {
        return { type: 'handle', value: cleanInput };
    }

    // Assume ID otherwise
    return { type: 'id', value: cleanInput };
}
