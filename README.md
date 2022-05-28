# syncer

Syncs galaxy integration forks with upstream

## Example Usage (workflow)
```yaml
name: sync-upstream
on:
  schedule:
    - cron: '30 5,17 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: GOG-Nebula/syncer@feature/initial
        with:
          upstream: owner/repo
          reviewers: username1,username2
```
***NOTE: should not be used in an integration (eg. cron value is just a random value)***