# Deployment Guide

This document provides detailed instructions for deploying the Strategy Board application to GitHub Pages.

## Prerequisites

- A GitHub account
- A fork or clone of this repository
- Node.js 22 or higher installed locally (for local testing)

## Initial Setup

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. In the left sidebar, click **Pages**
4. Under **Build and deployment**, set **Source** to **GitHub Actions**
5. Save the changes

### 2. Configure Repository Permissions

Ensure the GitHub Actions workflow has the necessary permissions:

1. Go to **Settings** → **Actions** → **General**
2. Scroll down to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

### 3. Update Vite Configuration (for Forks)

If you've forked this repository with a different name, update `vite.config.ts`:

```typescript
base: "/YOUR-REPOSITORY-NAME",
```

Replace `YOUR-REPOSITORY-NAME` with your actual repository name.

## Deployment Process

### Automatic Deployment

The site automatically deploys when:
- You push commits to the `main` branch
- A pull request is merged into `main`

### Manual Deployment

To manually trigger a deployment:

1. Go to the **Actions** tab in your repository
2. Click on **Deploy to GitHub Pages** workflow
3. Click the **Run workflow** button (on the right)
4. Select the `main` branch
5. Click **Run workflow**

## Verifying Deployment

After pushing to `main`:

1. Go to the **Actions** tab
2. You should see a workflow run in progress
3. Click on the workflow to see detailed logs
4. Once complete (green checkmark), your site will be live at:
   ```
   https://<your-username>.github.io/<repository-name>/
   ```

## Troubleshooting

### Build Fails

**Error: `npm ci` fails**
- Solution: Delete `package-lock.json` locally, run `npm install`, commit and push

**Error: TypeScript compilation errors**
- Solution: Run `npm run build` locally to see errors, fix them, then push

**Error: Vite build fails**
- Solution: Check that all imports are correct and files exist
- Ensure the base path in `vite.config.ts` is correct

### Deployment Fails

**Error: `404 - Page not found` after deployment**
- Check that the `base` path in `vite.config.ts` matches your repository name
- Ensure GitHub Pages is enabled in repository settings
- Verify the workflow completed successfully in the Actions tab

**Error: Assets not loading (blank page)**
- Incorrect `base` path in `vite.config.ts`
- Check browser console for 404 errors
- Ensure all asset paths are relative or use the `@` alias

**Error: Service worker registration fails**
- Check PWA configuration in `vite.config.ts`
- Ensure manifest paths are correct
- Verify HTTPS is being used (required for service workers)

### Permissions Issues

**Error: `refusing to allow a GitHub App to create or update workflow`**
- Go to Settings → Actions → General
- Enable "Read and write permissions"

**Error: `Resource not accessible by integration`**
- Check workflow permissions in repository settings
- Ensure `pages: write` and `id-token: write` are granted

### Cache Issues

If you're seeing old content:
1. Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache
3. Unregister service worker:
   - Open DevTools → Application → Service Workers
   - Click "Unregister"
4. Delete IndexedDB:
   - Open DevTools → Application → Storage
   - Select "IndexedDB" → Delete all

### Workflow Not Triggering

If the workflow doesn't run on push:
1. Check that the workflow file is in `.github/workflows/`
2. Ensure you're pushing to the `main` branch
3. Verify the workflow file has correct YAML syntax
4. Check the Actions tab for any disabled workflows

## Testing Locally

Before deploying, test the production build locally:

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Preview the production build
npm run preview
```

The preview server will show you exactly how the app will work when deployed.

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. Add a `CNAME` file to the `public/` directory with your domain
2. Configure DNS settings with your domain provider
3. Enable "Enforce HTTPS" in GitHub Pages settings

### Environment Variables

For environment-specific configuration:

1. Add variables to your repository secrets (Settings → Secrets)
2. Reference them in the workflow file
3. Use them in your build process

### Monitoring

Monitor your deployments:
- Check the Actions tab for workflow status
- Set up email notifications for failed workflows
- Use GitHub's deployment protection rules

## Best Practices

1. **Test Locally First**: Always run `npm run build` and `npm run preview` locally before pushing
2. **Branch Protection**: Consider enabling branch protection on `main` to require PR reviews
3. **Semantic Versioning**: Tag releases for easy rollback
4. **Monitor Bundle Size**: Keep an eye on the build output size
5. **Cache Strategy**: The PWA caches assets for offline use - clear cache when testing updates

## Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Actions documentation](https://docs.github.com/en/actions)
2. Review the [Vite deployment guide](https://vitejs.dev/guide/static-deploy.html)
3. Open an issue on the [repository](https://github.com/FRCTeam834/Strategy-Board/issues)

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm ci` | Install dependencies (production) |
| `npm install` | Install dependencies (development) |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite configuration, including base path |
| `.github/workflows/pages.yaml` | GitHub Actions deployment workflow |
| `src/config.ts` | Application configuration |
| `dist/` | Production build output (not committed) |