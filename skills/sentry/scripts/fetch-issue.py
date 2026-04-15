#!/usr/bin/env python3
"""Sentry 이슈 상세 정보를 REST API로 조회하여 출력합니다."""

import json
import os
import re
import sys
import urllib.request
import urllib.error


def extract_issue_id(url: str) -> str:
    """Sentry 이슈 URL에서 issue_id를 추출합니다."""
    # https://{org}.sentry.io/issues/{issue_id}/
    # https://sentry.io/organizations/{org}/issues/{issue_id}/
    match = re.search(r"/issues/(\d+)", url)
    if not match:
        print(f"Error: URL에서 issue_id를 추출할 수 없습니다: {url}", file=sys.stderr)
        sys.exit(1)
    return match.group(1)


def extract_org_slug(url: str) -> str | None:
    """Sentry URL에서 organization slug을 추출합니다."""
    # https://{org}.sentry.io/...
    match = re.search(r"https://([^.]+)\.sentry\.io/", url)
    if match:
        return match.group(1)
    # https://sentry.io/organizations/{org}/...
    match = re.search(r"/organizations/([^/]+)/", url)
    if match:
        return match.group(1)
    return None


def api_request(path: str, token: str, base_url: str = "https://sentry.io") -> dict:
    """Sentry REST API를 호출합니다."""
    url = f"{base_url}/api/0/{path.lstrip('/')}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"Error: API 요청 실패 ({e.code}): {url}\n{body}", file=sys.stderr)
        sys.exit(1)


def format_stacktrace(exception: dict) -> str:
    """예외 스택트레이스를 포맷합니다."""
    lines = []
    exc_type = exception.get("type", "Unknown")
    exc_value = exception.get("value", "")
    lines.append(f"  Exception: {exc_type}: {exc_value}")

    stacktrace = exception.get("stacktrace")
    if not stacktrace:
        return "\n".join(lines)

    frames = stacktrace.get("frames", [])
    for frame in frames:
        filename = frame.get("filename", "?")
        lineno = frame.get("lineNo") or frame.get("lineno") or "?"
        function = frame.get("function", "?")
        module = frame.get("module", "")

        in_app = frame.get("inApp", False)
        marker = "→" if in_app else " "

        lines.append(f"  {marker} {filename}:{lineno} in {function}")

        # 컨텍스트 라인 (에러 발생 지점 전후 코드)
        context_line = frame.get("contextLine")
        if context_line:
            pre_context = frame.get("preContext", [])
            post_context = frame.get("postContext", [])

            for i, line in enumerate(pre_context):
                ctx_lineno = (int(lineno) if lineno != "?" else 0) - len(pre_context) + i
                lines.append(f"       {ctx_lineno:>4} | {line}")
            lines.append(f"    >> {lineno:>4} | {context_line}")
            for i, line in enumerate(post_context):
                ctx_lineno = (int(lineno) if lineno != "?" else 0) + 1 + i
                lines.append(f"       {ctx_lineno:>4} | {line}")
            lines.append("")

    return "\n".join(lines)


def format_breadcrumbs(breadcrumbs: list, limit: int = 20) -> str:
    """Breadcrumbs를 포맷합니다."""
    if not breadcrumbs:
        return "  (없음)"
    lines = []
    for crumb in breadcrumbs[-limit:]:
        category = crumb.get("category", "")
        message = crumb.get("message", "")
        level = crumb.get("level", "")
        timestamp = crumb.get("timestamp", "")
        data = crumb.get("data", {})
        line = f"  [{timestamp}] [{level}] {category}: {message}"
        if data:
            line += f" | {json.dumps(data, ensure_ascii=False)}"
        lines.append(line)
    return "\n".join(lines)


def format_tags(tags: list) -> str:
    """태그를 포맷합니다."""
    if not tags:
        return "  (없음)"
    lines = []
    for tag in tags:
        key = tag.get("key", "")
        value = tag.get("value", "")
        lines.append(f"  {key}: {value}")
    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: fetch-issue.py <sentry-issue-url>", file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1]
    token = os.environ.get("SENTRY_AUTH_TOKEN")
    if not token:
        print("Error: SENTRY_AUTH_TOKEN 환경변수를 설정해주세요.", file=sys.stderr)
        print("  Sentry Settings > Auth Tokens에서 발급 가능합니다.", file=sys.stderr)
        print("  필요 권한: project:read, event:read", file=sys.stderr)
        sys.exit(1)

    issue_id = extract_issue_id(url)
    org_slug = extract_org_slug(url)

    # 1. 이슈 상세 조회
    issue = api_request(f"issues/{issue_id}/", token)

    # 2. 최신 이벤트 조회 (stacktrace 포함)
    latest_event = api_request(f"issues/{issue_id}/events/latest/", token)

    # === 출력 ===
    print("=" * 80)
    print("SENTRY ISSUE DETAILS")
    print("=" * 80)

    print(f"\n## 기본 정보")
    print(f"  Issue ID: {issue_id}")
    print(f"  Short ID: {issue.get('shortId', 'N/A')}")
    print(f"  Title: {issue.get('title', 'N/A')}")
    print(f"  Culprit: {issue.get('culprit', 'N/A')}")
    print(f"  Level: {issue.get('level', 'N/A')}")
    print(f"  Status: {issue.get('status', 'N/A')}")
    print(f"  Platform: {issue.get('platform', 'N/A')}")
    print(f"  Project: {issue.get('project', {}).get('slug', 'N/A')}")
    print(f"  First Seen: {issue.get('firstSeen', 'N/A')}")
    print(f"  Last Seen: {issue.get('lastSeen', 'N/A')}")
    print(f"  Events Count: {issue.get('count', 'N/A')}")
    print(f"  Users Affected: {issue.get('userCount', 'N/A')}")

    # 태그
    tags = latest_event.get("tags", [])
    print(f"\n## 태그")
    print(format_tags(tags))

    # 예외/스택트레이스
    entries = latest_event.get("entries", [])
    for entry in entries:
        if entry.get("type") == "exception":
            print(f"\n## 예외 / 스택트레이스")
            exceptions = entry.get("data", {}).get("values", [])
            for i, exc in enumerate(exceptions):
                if len(exceptions) > 1:
                    print(f"\n  --- Exception {i + 1} ---")
                print(format_stacktrace(exc))

        elif entry.get("type") == "breadcrumbs":
            print(f"\n## Breadcrumbs (최근 20개)")
            crumbs = entry.get("data", {}).get("values", [])
            print(format_breadcrumbs(crumbs))

        elif entry.get("type") == "request":
            req_data = entry.get("data", {})
            print(f"\n## HTTP Request")
            print(f"  Method: {req_data.get('method', 'N/A')}")
            print(f"  URL: {req_data.get('url', 'N/A')}")
            headers = req_data.get("headers", [])
            if headers:
                print(f"  Headers:")
                for h in headers:
                    if isinstance(h, list) and len(h) == 2:
                        print(f"    {h[0]}: {h[1]}")
            query = req_data.get("query", "")
            if query:
                print(f"  Query: {query}")
            data_body = req_data.get("data")
            if data_body:
                if isinstance(data_body, str):
                    print(f"  Body: {data_body[:500]}")
                else:
                    print(f"  Body: {json.dumps(data_body, ensure_ascii=False)[:500]}")

        elif entry.get("type") == "message":
            msg_data = entry.get("data", {})
            print(f"\n## Message")
            print(f"  {msg_data.get('formatted', msg_data.get('message', 'N/A'))}")

    # 컨텍스트
    contexts = latest_event.get("contexts", {})
    if contexts:
        print(f"\n## Contexts")
        for ctx_name, ctx_data in contexts.items():
            if ctx_data and isinstance(ctx_data, dict):
                print(f"  [{ctx_name}]")
                for k, v in ctx_data.items():
                    if k != "type":
                        print(f"    {k}: {v}")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
