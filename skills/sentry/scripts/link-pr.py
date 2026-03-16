#!/usr/bin/env python3
"""Sentry 이슈에 GitHub PR URL을 코멘트로 남깁니다."""

import os
import json
import re
import sys
import urllib.request
import urllib.error


def extract_issue_id(url: str) -> str:
    """Sentry 이슈 URL에서 issue_id를 추출합니다."""
    match = re.search(r"/issues/(\d+)", url)
    if not match:
        print(f"Error: URL에서 issue_id를 추출할 수 없습니다: {url}", file=sys.stderr)
        sys.exit(1)
    return match.group(1)


def main():
    if len(sys.argv) < 3:
        print("Usage: link-pr.py <sentry-issue-url> <pr-url>", file=sys.stderr)
        sys.exit(1)

    sentry_url = sys.argv[1]
    pr_url = sys.argv[2]

    token = os.environ.get("SENTRY_AUTH_TOKEN")
    if not token:
        print("Error: SENTRY_AUTH_TOKEN 환경변수를 설정해주세요.", file=sys.stderr)
        sys.exit(1)

    issue_id = extract_issue_id(sentry_url)

    # Sentry 이슈에 코멘트 추가
    api_url = f"https://sentry.io/api/0/issues/{issue_id}/comments/"
    body = json.dumps({"text": f"Fix PR: {pr_url}"}).encode()
    req = urllib.request.Request(
        api_url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Sentry 이슈 {issue_id}에 PR 링크를 등록했습니다: {pr_url}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        print(f"Error: 코멘트 등록 실패 ({e.code}): {err_body}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
