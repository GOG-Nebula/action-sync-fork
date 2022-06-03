import * as core from '@actions/core'
import * as github from '@actions/github'

const oktokit = github.getOctokit(core.getInput('token'))

class Plugin {
  readonly owner: string
  readonly repo: string
  readonly branch: string
  readonly version: string // This is a property instead of a function because
  // the action only runs within a short period of time
  // during which the plugin shouldn't change version.

  protected constructor(
    owner: string,
    repo: string,
    branch: string,
    version: string
  ) {
    this.owner = owner
    this.repo = repo
    this.branch = branch
    this.version = version
  }

  private static async version(owner: string, repo: string, branch: string) {
    const {data} = await oktokit.rest.repos.getContent({
      owner,
      repo,
      ref: branch,
      path: 'src/manifest.json'
    })

    if ('content' in data) {
      const text = Buffer.from(data.content, 'base64').toString()
      core.debug(`Manifest for ${owner}/${repo}@${branch}: ${text}`)
      return JSON.parse(text)['version']
    } else throw Error("'data' has no 'content' property! (manifest)")
  }

  static async build(owner: string, repo: string, branch?: string) {
    const the_branch =
      branch ||
      (await oktokit.rest.repos.get({owner, repo})).data.default_branch
    core.debug(`Chosen branch for ${owner}/${repo}: ${the_branch}`)
    const version = await Plugin.version(owner, repo, the_branch)
    core.debug(`Got version ${version} for ${owner}/${repo}@${the_branch}`)
    return new Plugin(owner, repo, the_branch, version)
  }
}

async function run() {
  core.info(`Is debug? ${core.isDebug() ? 'YES' : 'NO'}`)

  const base = await Plugin.build(
    github.context.repo.owner,
    github.context.repo.repo
  )
  const upstream = await Plugin.build(
    core.getInput('upstream_owner'),
    core.getInput('upstream_repo'),
    core.getInput('upstream_branch')
  )

  const reviewers = core.getInput('reviewers').split(',')
  core.debug('Got reviewers: ' + reviewers)

  try {
    const {data: pulls} = await oktokit.rest.search.issuesAndPullRequests({
      q: `repo:${base.owner}/${base.repo}+label:autosync+state:open+is:pr`,
      per_page: 1
    })
    core.debug(`Pulls: ${pulls.items.map(v => v.number).join(',')}`)
    core.info(`Found ${pulls.total_count} PRs open with the label: 'autosync'`)

    if (pulls.total_count < 1) {
      core.info('Continuing...')
      core.info(`Base version: ${base.version}`)
      core.info(`Upstream version: ${upstream.version}`)

      if (base.version !== upstream.version) {
        core.info('Creating PR')
        const {data: pr} = await oktokit.rest.pulls.create({
          owner: base.owner,
          repo: base.repo,
          head: upstream.owner + ':' + upstream.branch,
          base: base.branch,
          maintainer_can_modify: false,
          title: 'New version from upstream',
          body: `${base.version} --> ${upstream.version}\nNOTE: This PR will **include commits made after version release** and continue to do so (until merged).`
        })
        core.notice(`Created PR #${pr.number}`)
        await oktokit.rest.issues.addLabels({
          owner: base.owner,
          repo: base.repo,
          issue_number: pr.number,
          labels: ['autosync']
        })
        core.info("Added 'autosync' label.")
        await oktokit.rest.pulls.requestReviewers({
          owner: base.owner,
          repo: base.repo,
          pull_number: pr.number,
          reviewers
        })
        core.info(`Added reviewers: ${reviewers}`)
      } else core.notice('Nothing to do!')
    } else core.notice('Already been done!')
  } catch (error: any) {
    core.setFailed(error)
  }
}

run()
