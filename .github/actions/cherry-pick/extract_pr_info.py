#!/usr/bin/env python3

# SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import sys
from typing import Dict, List, Optional

import github3

import release_notes.model as rnm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PRInfoExtractionError(Exception):
    """Custom exception for PR info extraction operations."""
    pass


def extract_pr_info(pr_number: int, repo_owner: str, repo_name: str, github_token: str) -> Dict:
    """Extract comprehensive PR information including release notes.

    Args:
        pr_number: The PR number to extract info from
        repo_owner: Repository owner
        repo_name: Repository name
        github_token: GitHub authentication token

    Returns:
        Dictionary containing PR information

    Raises:
        PRInfoExtractionError: If extraction fails
    """
    try:
        # Create GitHub client
        gh = github3.login(token=github_token)
        repo = gh.repository(repo_owner, repo_name)
        pr = repo.pull_request(pr_number)

        if not pr:
            raise PRInfoExtractionError(f"PR #{pr_number} not found")

        logger.info(f"Processing PR #{pr_number}: {pr.title}")

        # Extract basic PR information
        pr_info = {
            'number': pr_number,
            'title': pr.title or '',
            'body': pr.body or '',
            'html_url': pr.html_url,
            'head_sha': pr.head.sha,
            'base_branch': pr.base.ref,
            'head_branch': pr.head.ref,
            'labels': [],
            'release_notes': ''
        }

        # Extract labels
        labels = []
        for label in pr.labels:
            labels.append({
                'name': label.get('name', ''),
                'color': label.get('color', ''),
                'description': label.get('description', '') or ''
            })
        pr_info['labels'] = labels

        # Extract labels that should be copied to cherry-pick PR
        copyable_labels = [
            label['name'] for label in labels
            if label['name'].startswith(('area', 'kind'))
        ]
        pr_info['copyable_labels'] = copyable_labels

        # Extract release notes if PR has body content
        if pr.body:
            try:
                # Use gardener-gha-libs to extract source blocks
                valid_blocks, malformed_blocks = rnm.iter_source_blocks(
                    source=pr,
                    content=pr.body
                )

                if malformed_blocks:
                    logger.info(f"Found {len(malformed_blocks)} malformed release note block(s)")
                    for block in malformed_blocks:
                        logger.warning(f"Malformed release note block: {block}")

                if valid_blocks:
                    logger.info(f"Found {len(valid_blocks)} release note block(s)")

                    # Format release notes
                    release_notes = []
                    for block in valid_blocks:
                        if block.has_content():
                            formatted_note = f"```{block.category} {block.target_group}\n{block.note_message}\n```"
                            release_notes.append(formatted_note)

                    pr_info['release_notes'] = '\n'.join(release_notes)
                else:
                    logger.info(f"No release note blocks found in PR #{pr_number}")
                    pr_info['release_notes'] = ''

            except Exception as e:
                logger.warning(f"Failed to extract release notes from PR #{pr_number}: {e}")
                pr_info['release_notes'] = ''
        else:
            logger.warning(f"PR #{pr_number} has no body content")

        return pr_info

    except Exception as e:
        logger.error(f"Error extracting PR info for #{pr_number}: {e}")
        raise PRInfoExtractionError(f"Failed to extract PR info: {e}")


def main() -> None:
    """Main entry point for the PR info extraction script.

    Parses command line arguments and extracts PR information.
    Expects GITHUB_TOKEN environment variable to be set.

    Outputs:
        - pr-info.json: Complete PR information as JSON
        - release-notes.md: Extracted release notes in markdown format
        - copyable-labels.txt: Labels that should be copied (one per line)

    Exit codes:
        0: Success
        1: Error occurred during extraction
    """
    if len(sys.argv) != 4:
        print("Usage: extract_pr_info.py <pr_number> <repo_owner> <repo_name>")
        sys.exit(1)

    github_token = os.getenv('GITHUB_TOKEN')
    if not github_token:
        logger.error("GITHUB_TOKEN environment variable is required")
        sys.exit(1)

    try:
        pr_number = int(sys.argv[1])
        repo_owner = sys.argv[2]
        repo_name = sys.argv[3]

        # Extract PR information
        pr_info = extract_pr_info(pr_number, repo_owner, repo_name, github_token)

        # Write PR info as JSON
        with open('pr-info.json', 'w', encoding='utf-8') as f:
            json.dump(pr_info, f, indent=2, ensure_ascii=False)

        # Write release notes as markdown
        with open('release-notes.md', 'w', encoding='utf-8') as f:
            f.write(pr_info['release_notes'])

        # Write copyable labels (one per line)
        with open('copyable-labels.txt', 'w', encoding='utf-8') as f:
            for label in pr_info['copyable_labels']:
                f.write(f"{label}\n")

        logger.info(f"Successfully extracted PR info for #{pr_number}")
        logger.info(f"Release notes: {'Found' if pr_info['release_notes'] else 'None'}")
        logger.info(f"Copyable labels: {len(pr_info['copyable_labels'])}")

    except (ValueError, PRInfoExtractionError) as e:
        logger.error(f"Extraction failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
