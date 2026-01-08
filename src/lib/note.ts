import * as cheerio from 'cheerio';

export interface NoteItem {
    id: string; // URL as ID
    title: string;
    thumbnail: string;
    publishedAt: string;
    url: string;
    authorName?: string;
    authorUrl?: string; // Additional metadata
}

export async function getNoteUserRSS(userIdentifier: string): Promise<{ channelName: string, items: NoteItem[] }> {
    // 1. Extract User ID
    let userId = userIdentifier;

    // Handle URL: https://note.com/user_id
    if (userIdentifier.startsWith('http')) {
        try {
            const urlObj = new URL(userIdentifier);
            // Path should be /user_id or /user_id/rss
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
                userId = pathParts[0];
            }
        } catch (e) {
            console.warn("Invalid Note URL", e);
        }
    }

    // Remove @ if user input it (Note standard is no @ in URL usually, but user might assume)
    userId = userId.replace(/^@/, '');

    const rssUrl = `https://note.com/${userId}/rss`;

    return fetchAndParseRss(rssUrl, userId);
}

export async function searchNoteByHashtag(query: string): Promise<NoteItem[]> {
    // Note uses hashtags nicely. We treat the search query as a hashtag.
    // Clean query: space -> underscore or just take the main keyword.
    // Usually hashtags doesn't support spaces.
    const tag = query.trim().split(/\s+/)[0]; // Take first word for safety

    const rssUrl = `https://note.com/hashtag/${encodeURIComponent(tag)}/rss`;
    const result = await fetchAndParseRss(rssUrl, tag);
    return result.items;
}

async function fetchAndParseRss(url: string, fallbackName: string): Promise<{ channelName: string, items: NoteItem[] }> {
    try {
        console.log(`[Note] Fetching RSS: ${url}`);
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`[Note] Failed to fetch RSS: ${res.statusText}`);
            return { channelName: fallbackName, items: [] };
        }

        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const channelTitle = $('channel > title').first().text().replace(' - note', '') || fallbackName;

        const items: NoteItem[] = [];
        $('item').each((_, el) => {
            const title = $(el).find('title').text();
            const link = $(el).find('link').text();
            const pubDate = $(el).find('pubDate').text();
            const thumbnail = $(el).find('media\\:thumbnail').attr('url') || "";

            // Note sometimes puts creator name in dc:creator?
            // Not critical for now.

            items.push({
                id: link, // using link as ID since it's unique
                title,
                url: link,
                thumbnail,
                publishedAt: pubDate
            });
        });

        console.log(`[Note] Found ${items.length} items`);
        return { channelName: channelTitle, items };

    } catch (e) {
        console.error("[Note] RSS Parsing Error", e);
        return { channelName: fallbackName, items: [] };
    }
}
