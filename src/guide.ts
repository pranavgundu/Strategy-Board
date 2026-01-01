import { marked } from "marked";

export class Guide {
    private container: HTMLElement | null;
    private contentElement: HTMLElement | null;

    constructor() {
        this.container = document.getElementById("guide-container");
        this.contentElement = document.getElementById("guide-content");
        this.configureMarked();
    }

    private configureMarked(): void {
        // Configure marked to handle links and images properly
        marked.setOptions({
            breaks: true,
            gfm: true,
        });

        // Custom renderer for better styling
        const renderer = new marked.Renderer();
        const originalLinkRenderer = renderer.link.bind(renderer);
        const originalImageRenderer = renderer.image.bind(renderer);
        const originalHeadingRenderer = renderer.heading.bind(renderer);

        renderer.link = (args: any) => {
            const html = originalLinkRenderer(args);
            if (args.href && args.href.startsWith("http")) {
                return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: none;" ');
            } else if (args.href && args.href.startsWith("#")) {
                // Internal anchor links - scroll to section without changing hash
                const targetId = args.href.substring(1);
                return `<a href="javascript:void(0)" onclick="document.getElementById('${targetId}')?.scrollIntoView({behavior:'smooth'})" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${args.text}</a>`;
            }
            return html.replace(/^<a /, '<a style="color: #3b82f6; text-decoration: none;" ');
        };

        renderer.image = (args: any) => {
            const html = originalImageRenderer(args);
            return html.replace('<img ', '<img style="max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0;" ');
        };

        renderer.heading = (args: any) => {
            const level = args.depth;
            const text = args.text;
            // Generate ID from text (lowercase, replace spaces with hyphens)
            const id = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
            const marginTop = level === 1 ? '2.5rem' : level === 2 ? '2rem' : '1.5rem';
            const fontSize = level === 1 ? '2.25rem' : level === 2 ? '1.875rem' : '1.5rem';
            const fontWeight = level <= 2 ? '700' : '600';
            return `<h${level} id="${id}" style="margin-top: ${marginTop}; margin-bottom: 1rem; font-size: ${fontSize}; font-weight: ${fontWeight}; color: #111827; scroll-margin-top: 2rem;">${text}</h${level}>`;
        };

        marked.setOptions({ renderer });
    }

    async loadMarkdown(): Promise<void> {
        if (!this.contentElement) {
            console.error("Guide content element not found");
            return;
        }

        try {
            // Fetch the USAGE.md file
            const response = await fetch("/USAGE.md");
            if (!response.ok) {
                throw new Error(`Failed to load guide: ${response.statusText}`);
            }

            const markdown = await response.text();

            // Convert markdown to HTML
            let html = await marked.parse(markdown) as string;

            // Fix raw HTML anchor links in the markdown (table of contents)
            html = html.replace(/<a href="#([^"]+)"[^>]*>([^<]+)<\/a>/g, (match, targetId, text) => {
                return `<a href="javascript:void(0)" onclick="event.preventDefault();document.getElementById('${targetId}')?.scrollIntoView({behavior:'smooth',block:'start'})" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${text}</a>`;
            });

            // Fix paragraph alignment
            html = html.replace(/<p align="center">/g, '<p style="text-align: center;">');

            // Fix image tags to ensure proper loading and styling
            html = html.replace(/<img ([^>]+)>/g, (match, attrs) => {
                // Extract src attribute
                const srcMatch = attrs.match(/src="([^"]+)"/);
                if (!srcMatch) return match;

                const src = srcMatch[1];
                const altMatch = attrs.match(/alt="([^"]*)"/);
                const alt = altMatch ? altMatch[1] : '';
                const widthMatch = attrs.match(/width="([^"]*)"/);
                const width = widthMatch ? widthMatch[1] : '100%';

                return `<img src="${src}" alt="${alt}" loading="lazy" style="max-width: ${width}; height: auto; border-radius: 8px; margin: 1.5rem auto; display: block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onerror="this.style.display='none';console.warn('Image blocked by CORS (normal on localhost):', this.src)" />`;
            });

            // Add comprehensive styling
            const styledHTML = `
                <style>
                    #guide-content p { margin: 1rem 0; font-size: 1rem; }
                    #guide-content ul, #guide-content ol { margin: 1rem 0; padding-left: 2rem; }
                    #guide-content li { margin: 0.5rem 0; }
                    #guide-content code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.875rem; color: #ef4444; }
                    #guide-content pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1.5rem 0; }
                    #guide-content pre code { background: transparent; color: inherit; padding: 0; }
                    #guide-content blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1.5rem 0; color: #6b7280; font-style: italic; }
                    #guide-content table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
                    #guide-content th, #guide-content td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
                    #guide-content th { background: #f9fafb; font-weight: 600; }
                    #guide-content hr { border: none; border-top: 2px solid #e5e7eb; margin: 2rem 0; }
                    #guide-content a:hover { text-decoration: underline; }
                    #guide-content strong { font-weight: 600; color: #111827; }
                    #guide-content em { font-style: italic; }
                </style>
                ${html}
            `;

            // Insert the HTML into the content element
            this.contentElement.innerHTML = styledHTML;

            // Smooth scroll to top when guide loads
            if (this.container) {
                this.container.scrollTop = 0;
            }
        } catch (error) {
            console.error("Error loading guide:", error);
            this.contentElement.innerHTML = `
                <div style="color: #ef4444; text-align: center; padding: 2rem;">
                    <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Failed to Load Guide</h2>
                    <p>Unable to load the usage guide. Please try again later.</p>
                    ${window.location.hostname === 'localhost' ? '<p style="margin-top: 1rem; color: #6b7280; font-size: 0.875rem;">Note: Images from GitHub may not load on localhost due to CORS restrictions. They will work in production.</p>' : ''}
                </div>
            `;
        }
    }

    show(): void {
        if (this.container) {
            this.container.classList.remove("hidden");
            // Load markdown content when showing the guide
            this.loadMarkdown();
        }
    }

    hide(): void {
        if (this.container) {
            this.container.classList.add("hidden");
        }
    }
}
