# Contribution Guidelines

Thanks you for considering a contribution to Microcosm!

Microcosm is built using tools written for
[nodejs](http://nodejs.org). We recommend installing Node with
[nvm](https://github.com/creationix/nvm). Dependencies are managed
through `package.json`.

You can install dependencies with:

```bash
npm install
```

## Testing

```bash
npm test
```

For test coverage:

```bash
npm run test:cov
open ./coverage/index.html
```

Be sure to check the `./coverage` folder to verify all code paths are
touched.

## Deployment

The following steps are required to push a new release:

1. Update changelog
2. `npm version <major,minor,patch>`
3. `git push --tags`
4. `make release`


Microcosm must first be compiled down to ES5 using Babel. The
following command will perform that task and deploy to NPM:

```bash
make release
```

For release candidates, consider deploying to NPM using the `beta` tag
with:

```bash
make prerelease
```

## Conventions

**Consider master unsafe**, use [`npm`](https://www.npmjs.com/package/microcosm) for the latest stable version.

### Javascript

Microcosm uses ES6 Javascript (compiled using [Babel](babeljs.io)). As
for style, shoot for:

- No semicolons
- Commas last,
- 2 spaces for indentation (no tabs)
- Prefer ' over ", use string interpolation
- 80 character line length

### Reviews

All changes should be submitted through pull request. Ideally, at
least two :+1:s should be given before a pull request is merge.
