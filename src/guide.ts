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

        // Custom renderer to make external links open in new tab
        const renderer = new marked.Renderer();
        const originalLinkRenderer = renderer.link.bind(renderer);

        renderer.link = (args: any) => {
            const html = originalLinkRenderer(args);
            if (args.href && args.href.startsWith("http")) {
                return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
            }
            return html;
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
            const html = await marked.parse(markdown);

            // Insert the HTML into the content element
            this.contentElement.innerHTML = html as string;

            // Smooth scroll to top when guide loads
            if (this.container) {
                this.container.scrollTop = 0;
            }
        } catch (error) {
            console.error("Error loading guide:", error);
            this.contentElement.innerHTML = `
                <div class="text-red-400 text-center py-8">
                    <h2 class="text-2xl font-bold mb-4">Failed to Load Guide</h2>
                    <p>Unable to load the usage guide. Please try again later.</p>
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
