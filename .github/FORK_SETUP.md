# Fork Setup Checklist

If you've forked this repository to create your own version for a different game year or team, follow this checklist to ensure everything works correctly.

## Required Changes

### 1. Update Repository Name
- [ ] Rename your repository if needed (Settings → General → Repository name)
- [ ] Note your repository name: `________________`

### 2. Update Vite Configuration
- [ ] Open `vite.config.ts`
- [ ] Update the `base` property to match your repository name:
  ```typescript
  base: "/YOUR-REPOSITORY-NAME",
  ```
- [ ] Example: If your repo is `StrategyBoard2026`, use `base: "/StrategyBoard2026"`

### 3. Enable GitHub Pages
- [ ] Go to Settings → Pages
- [ ] Set Source to **GitHub Actions**
- [ ] Save changes

### 4. Configure Workflow Permissions
- [ ] Go to Settings → Actions → General
- [ ] Under "Workflow permissions":
  - [ ] Select **Read and write permissions**
  - [ ] Check **Allow GitHub Actions to create and approve pull requests**
- [ ] Click Save

### 5. Update Field Image
- [ ] Replace `src/field.png` with the new game's field image
- [ ] Ensure the image is high resolution (recommended: 3510×1610 pixels)
- [ ] Save with the same filename: `field.png`

### 6. Update Field Configuration
- [ ] Open `src/config.ts`
- [ ] Update field dimensions:
  - [ ] `fieldPNGPixelWidth` - width of your field image in pixels
  - [ ] `fieldPNGPixelHeight` - height of your field image in pixels
  - [ ] `fieldRealWidthInches` - actual field width in inches
  - [ ] `fieldRealHeightInches` - actual field height in inches
- [ ] Update driver station positions if they changed:
  - [ ] Red alliance positions (redOneStationX/Y, redTwoStationX/Y, redThreeStationX/Y)
  - [ ] Blue alliance positions (blueOneStationX/Y, blueTwoStationX/Y, blueThreeStationX/Y)

### 7. Update PWA Manifest
- [ ] Open `vite.config.ts`
- [ ] Update the PWA manifest:
  - [ ] `name` - e.g., "StrategyBoard2026"
  - [ ] `short_name` - e.g., "Strategy2026"
  - [ ] `description` - e.g., "FRC2026 Strategy Board"

### 8. Update README
- [ ] Open `README.md`
- [ ] Update the title (e.g., "FRC StrategyBoard 2026")
- [ ] Update the deployment URL in the badge:
  ```markdown
  [![Deploy](https://github.com/YOUR-USERNAME/YOUR-REPO/actions/workflows/pages.yaml/badge.svg)](https://github.com/YOUR-USERNAME/YOUR-REPO/actions/workflows/pages.yaml)
  ```
- [ ] Update the app link to your GitHub Pages URL
- [ ] Update issue/PR links to point to your repository
- [ ] Update credits and acknowledgments as needed

### 9. Update Favicon (Optional but Recommended)
- [ ] Replace files in `public/favicon/`:
  - [ ] `favicon.ico`
  - [ ] `apple-touch-icon.png`
  - [ ] `andriod-chrome-192x192.png`
  - [ ] `andriod-chrome-512x512.png`
- [ ] You can use tools like [favicon.io](https://favicon.io/) to generate these

### 10. Test Locally
- [ ] Run `npm ci` to install dependencies
- [ ] Run `npm run build` to ensure the build works
- [ ] Run `npm run preview` to test the production build
- [ ] Open the preview URL and test all features
- [ ] Verify that:
  - [ ] Field image displays correctly
  - [ ] Robot positions are correct
  - [ ] Drawing works
  - [ ] QR code export/import works
  - [ ] PWA installs correctly

### 11. Deploy
- [ ] Commit all changes
- [ ] Push to `main` branch
- [ ] Go to Actions tab and verify deployment succeeds
- [ ] Visit your GitHub Pages URL: `https://YOUR-USERNAME.github.io/YOUR-REPO/`
- [ ] Test the deployed site thoroughly

## Optional Enhancements

### Team Branding
- [ ] Add team logo to the UI
- [ ] Customize color scheme in `index.html` and Tailwind config
- [ ] Update theme colors in PWA manifest

### Additional Features
- [ ] Add team-specific game elements
- [ ] Customize robot default dimensions
- [ ] Add pre-drawn field elements or zones
- [ ] Modify color palette for drawing tools

### Analytics (Optional)
- [ ] Add Google Analytics or similar
- [ ] Add error tracking (e.g., Sentry)

## Verification Checklist

After deployment, verify:
- [ ] Site loads at your GitHub Pages URL
- [ ] No 404 errors in browser console
- [ ] Field image displays correctly
- [ ] Can create new matches
- [ ] Can draw on the whiteboard
- [ ] Can export/import via QR codes
- [ ] PWA installation works on mobile
- [ ] Offline mode works (test by disabling internet)
- [ ] All modes work (Auton, Teleop, Endgame)
- [ ] Robot manipulation works (drag, rotate, resize)
- [ ] Undo functionality works
- [ ] Data persists after page reload

## Common Issues

### Site Shows 404
- Check that `base` in `vite.config.ts` matches your repository name exactly
- Verify GitHub Pages is enabled and set to GitHub Actions

### Assets Don't Load
- Ensure the base path is correct
- Check browser console for specific 404 errors
- Verify all imports use the `@/` alias or relative paths

### Build Fails
- Run `npm run build` locally to see errors
- Check that all TypeScript types are correct
- Ensure `field.png` exists in `src/`

### PWA Doesn't Install
- Ensure you're using HTTPS (GitHub Pages does this automatically)
- Check manifest configuration in `vite.config.ts`
- Verify icon files exist in `public/favicon/`

## Need Help?

- Review the [Deployment Guide](.github/DEPLOYMENT.md)
- Check [GitHub Actions logs](../../actions) for build errors
- Open an [issue](https://github.com/FRCTeam834/StrategyBoard2025/issues) on the original repository
- Review [Vite documentation](https://vitejs.dev/)

## Quick Commands

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

---

**Good luck with your season! 🤖🎮**