import { MetadataRoute } from 'next';
import { LINES } from '@/lib/registry/lines';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unkyu-hokkaido.jp';

    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/faq`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/accuracy`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/legal-notation`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ];

    // 路線別ページを動的生成
    const routePages: MetadataRoute.Sitemap = LINES.map((line) => ({
        url: `${baseUrl}/line/${line.slug}`,
        lastModified: new Date(),
        changeFrequency: 'hourly' as const,
        priority: 0.8,
    }));

    return [...staticPages, ...routePages];
}
