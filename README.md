# Cellbound

## Deployment

The `main` branch builds Cellbound and deploys the production `dist/` output to the shared hosting `./cb/` directory via GitHub Actions.

Production URL: `https://athleticsmanagergame.com/cb/`

The production web path is `/cb/`. If `cb.athleticsmanagergame.com` is kept as an alias, its document root should also point to the lowercase `/cb` directory.

FTPS deployment is configured through repository Actions secrets.
