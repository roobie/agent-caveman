# Contributing to Caveman

Thanks for helping make the cave bigger. PRs are welcome: skill wording,
agent integrations, bug fixes, docs.

A new agent integration is one entry in the `PROVIDERS` array of
`installer/install.js`. Read `CLAUDE.md` first.

## Sign your commits (DCO)

This project uses the [Developer Certificate of Origin](https://developercertificate.org/).
It's a one-line promise that you wrote the code (or have the right to contribute
it). Add a sign-off to every commit:

```bash
git commit -s -m "your message"
```

That appends a `Signed-off-by: Your Name <your@email>` trailer. No CLA, no forms.

## Licensing of contributions

Whole repo is [Apache-2.0](LICENSE) (see [LICENSING.md](LICENSING.md)).
Contributions are inbound = outbound: you license your change under the same
Apache-2.0 terms. Simple.

## Where changes land

Open a pull request against this repository. A maintainer checks license scope,
tests, generated artifacts, and security boundaries for affected directory.

Keep generated files in same pull request as their source and retain commit
authorship and DCO sign-off.

## Before you open a PR

- Run the suites: `npm test`, `python3 -m unittest tests.test_hooks tests.test_mode_tracker`,
  and `python3 tests/verify_repo.py`.
- Match the surrounding style. Small, focused PRs review fastest.

Questions → open a discussion or ping us at **hello@caveman.so**.
