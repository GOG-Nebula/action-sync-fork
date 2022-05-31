# action-sync-fork

Syncs galaxy integration forks with upstream

## Example Usage (workflow) - OUTDATED

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

**_NOTE: should not be used in an integration (eg. cron value is just a random value)_**

## TODO

- [ ] better logging in the action
- [ ] update the readme
- [ ] fix this repo's workflows (incl making them use yarn instead of npm)
- [ ] add tests (maybe not worth it)
- [ ] improve code readablitiy
