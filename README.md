# FRC StrategyBoard 2025

[![Deploy to GitHub Pages](https://github.com/FRCTeam834/StrategyBoard2025/actions/workflows/pages.yaml/badge.svg)](https://github.com/FRCTeam834/StrategyBoard2025/actions/workflows/pages.yaml)

<a href="https://imgbox.com/TxsFBIir" target="_blank"><img src="https://images2.imgbox.com/85/8f/TxsFBIir_o.png" alt="image host"/></a>

[StrategyBoard2025](https://frcteam834.github.io/StrategyBoard2025/) is a digital strategy whiteboard for FIRST Robotics competitions.

## Getting Started

### https://frcteam834.github.io/StrategyBoard2025/

> This app is intended for tablets in landscape mode. However, it should work on most platforms

### Install as a PWA

For the best experience, especially on mobile devices, install the website as a Progressive Web App (PWA).

> On mobile, PWA will remove the browser UI for a larger app window.

## Features

### Whiteboard

- Draw
- Erase
- Undo
- Robots
    - Draggable
    - Rotatable
    - Edit Robot dimensions (to scale)
- Separate whiteboard for auton, teleop, endgame
- Toggle betwen three perspectives

### Offline

This app works offline. Before entering the competition venue, open the app once to cache the files.

To test if offline is working, disable internet and try to access the app.

### Persistent Storage

All previous whiteboards are stored in IndexedDB. Use the **Clear** button to clear IndexedDB.

### QR Code Transfer

Whiteboards can be transferred offline across devices through QR codes.

> The device importing the whiteboard must have a camera.

**Instructions:**

*Device that is exporting:*<br/>
**Tap the three white dots** > **Export**

*Device that is importing:*<br/>
**Import QR** > Switch Camera (if needed) > **Keep QR code within the yellow corners**

When the import is finished, it will automatically close the window. Tap outside the window at any time to cancel the import/export.

By nature, importing may take a few seconds. For the fastest imports:

- Don't draw excessively; every additional point is more data to send
- Find decent diffuse lighting without any glare
- Make sure the importing device has a good camera >15fps

<a href="https://imgbox.com/xirEOutY" target="_blank"><img src="https://images2.imgbox.com/86/34/xirEOutY_o.png" alt="image host"/></a>

## Deployment

This project is configured to automatically deploy to GitHub Pages when changes are pushed to the `main` branch.

### GitHub Pages Setup

If you've forked this repository, you need to enable GitHub Pages:

1. Go to your repository's **Settings**
2. Navigate to **Pages** in the left sidebar
3. Under **Source**, select **GitHub Actions**
4. Push to `main` branch and the workflow will automatically deploy your site

The site will be available at: `https://<your-username>.github.io/<repository-name>/`

### Manual Deployment

You can also trigger a deployment manually:

1. Go to the **Actions** tab in your repository
2. Select the **Deploy to GitHub Pages** workflow
3. Click **Run workflow**

### Local Development

To run the project locally:

```bash
# Install dependencies
npm ci

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Issues

Please report any bugs on [GitHub](https://github.com/FRCTeam834/StrategyBoard2025/issues/new).

If the app isn't working, try to:

- Manually clear IndexedDB
- Delete and re-add as PWA
- Manully unregister the service worker

## Contributing

This was scrapped together in a few days, so the code is not maintainable. However, edits to the README are welcome. Please suggest them through [pull requests](https://github.com/FRCTeam834/StrategyBoard2025/pulls) :)

## Future Use

Updating the project for future games is easy:

1. [Fork](https://github.com/FRCTeam834/StrategyBoard2025/fork) the project
2. Replace `src/field.png` with the new field image
3. Update `src/config.ts` with new field dimensions
4. Update the `base` path in `vite.config.ts` to match your repository name
5. Enable GitHub Pages (see **Deployment** section above)
6. Push the changes to `main`, and the app will automatically deploy to `https://<github-username>.github.io/<fork-name>/`

## Credits

Field image - https://github.com/mjansen4857/pathplanner