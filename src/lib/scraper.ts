import * as cheerio from 'cheerio';

export async function scrapeWebPage(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove clutter
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('header').remove();
        $('footer').remove();
        $('aside').remove();
        $('.ads').remove();
        $('[class*="ad-"]').remove();

        // Try to find the main content
        let content = '';

        // Priority 1: Article tag
        if ($('article').length > 0) {
            content = $('article').text();
        }
        // Priority 2: Main tag
        else if ($('main').length > 0) {
            content = $('main').text();
        }
        // Priority 3: Common content class selectors
        else {
            const selectors = ['.post-content', '.entry-content', '#content', '.content', '.article-body'];
            for (const selector of selectors) {
                if ($(selector).length > 0) {
                    content = $(selector).text();
                    break;
                }
            }
        }

        // Fallback: Body
        if (!content) {
            content = $('body').text();
        }

        // Clean up whitespace
        const cleanContent = content.replace(/\s+/g, ' ').trim();
        const title = $('title').text().trim() || 'No Title';
        const thumbnail = $('meta[property="og:image"]').attr('content') || '';

        return {
            title,
            content: cleanContent,
            thumbnail,
            type: 'web'
        };
    } catch (error) {
        console.error('Error scraping page:', error);
        throw new Error('Failed to extract content from the URL.');
    }
}
