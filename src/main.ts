import * as core from '@actions/core'
import * as github from '@actions/github'

const oktokit = github.getOctokit(core.getInput('token'))

async function run() {
  const owner = github.context.repo.owner
  const repo = github.context.repo.repo
  const upstream_owner = core.getInput('upstream_owner')
  const upstream_repo = core.getInput('upstream_repo')
  const upstream_branch =
    core.getInput('upstream_branch') ||
    (await oktokit.rest.repos.get({owner: upstream_owner, repo: upstream_repo}))
      .data.default_branch
  const reviewers = core.getInput('reviewers').split(',')
  const base_branch = (await oktokit.rest.repos.get({owner, repo})).data
    .default_branch

  try {
    const {data: autosync_pulls} =
      await oktokit.rest.search.issuesAndPullRequests({
        q: 'label:autosync+state:open+is:pull-request',
        per_page: 1
      })
    if (autosync_pulls.total_count < 1) {
      const {data: upstream_manifest} = await oktokit.rest.repos.getContent({
        owner: upstream_owner,
        repo: upstream_repo,
        ref: upstream_branch,
        path: 'src/manifest.json'
      })
      const {data: base_manifest} = await oktokit.rest.repos.getContent({
        owner,
        repo,
        path: 'src/manifest.json'
      })
      if ('content' in base_manifest && 'content' in upstream_manifest) {
        core.info(upstream_manifest.content)
        const base_version = JSON.parse(base_manifest.content)['version']
        const upstream_version = JSON.parse(upstream_manifest.content)[
          'version'
        ]
        core.info('Base ver: ' + base_version)
        core.info('Upstream ver: ' + upstream_version)
        if (base_version !== upstream_version) {
          const {data: pr} = await oktokit.rest.pulls.create({
            owner,
            repo,
            head: upstream_owner + ':' + upstream_branch,
            base: base_branch,
            maintainer_can_modify: false,
            title: 'New version from upstream'
          })
          oktokit.rest.issues.addLabels({
            owner,
            repo,
            issue_number: pr.number,
            labels: ['autosync']
          })
          oktokit.rest.pulls.requestReviewers({
            owner,
            repo,
            pull_number: pr.number,
            reviewers
          })
        }
      }
    }
  } catch (error: any) {
    core.setFailed(error)
  }
}

run()
