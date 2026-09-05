# Changesets

Run `npm run changeset` after a user-facing change, pick the packages and bump type, and
commit the generated file. `npm run version-packages` turns pending changesets into version
bumps and CHANGELOG entries; `npm run release` builds and publishes.

The three packages are `linked`, so they always share a version number.
