//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import initOctokit from './octokit.js'
import config from '../config/index.js'

const octokit = initOctokit()
const {
  org: owner,
  repository: repo,
} = config.gitHub || {}

function searchIssues ({ state, title } = {}) {
  const q = [
    `repo:${owner}/${repo}`,
    'is:issue',
  ]
  if (state) {
    q.push(`state:${state}`)
  }
  if (title) {
    q.push(`${title} in:title`)
  }
  const options = octokit.search.issuesAndPullRequests.endpoint.merge({
    q: q.join(' '),
  })
  return octokit.paginate(options)
}

function getIssue ({ number }) {
  return octokit.issues.get({
    owner,
    repo,
    issue_number: number,
  })
}

function closeIssue ({ number }) {
  return octokit.issues.update({
    owner,
    repo,
    issue_number: number,
    state: 'closed',
  })
}

async function getComments ({ number }) {
  if (!Number.isInteger(number)) {
    throw new TypeError(`Invalid input: Issue 'number' must be an integer. Received: ${number}`)
  }
  const query =
  `query paginate($cursor: String, $owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        comments(first: 50, after: $cursor) {
          nodes {
            databaseId
            id
            url
            createdAt
            updatedAt
            authorAssociation
            author {
              login
              avatarUrl
            }
            body
            isMinimized
            minimizedReason
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }`
  const { repository } = await octokit.graphql.paginate(query, { owner, repo, number })
  return repository.issue.comments.nodes
    .filter(node => !node.isMinimized)
    .map(node => {
      const author = node.author ?? {}
      return {
        id: node.databaseId,
        node_id: node.id,
        html_url: node.url,
        user: {
          login: author.login ?? 'ghost',
          avatar_url: author.avatarUrl,
        },
        created_at: node.createdAt,
        updated_at: node.updatedAt,
        author_association: node.authorAssociation,
        body: node.body,
      }
    })
}

function createComment ({ number }, body) {
  return octokit.issues.createComment({
    owner,
    repo,
    issue_number: number,
    body,
  })
}

export {
  octokit,
  searchIssues,
  closeIssue,
  getIssue,
  getComments,
  createComment,
}
