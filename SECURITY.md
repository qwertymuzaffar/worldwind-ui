# Security policy

## Supported versions

Fixes go into the latest minor of `worldwind-kit`, `react-worldwind` and `ngx-worldwind`, which are
released together. Older versions do not receive patches.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting instead: the **Security** tab of
the repository, then **Report a vulnerability**. Include the package and version, what the problem
allows, and steps or a snippet to reproduce it.

You will get an acknowledgement within a week. Confirmed problems are fixed in a patch release with
a changelog entry that credits the reporter, unless they prefer otherwise.

## Scope

The packages run in the browser and do not handle credentials. Issues in NASA WorldWind itself
belong to the [WebWorldWind](https://github.com/NASAWorldWind/WebWorldWind) project; issues in the
demo sites (which only serve static files) are welcome here.
