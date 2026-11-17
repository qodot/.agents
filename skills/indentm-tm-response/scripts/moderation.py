import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import tempfile
import time

parser = argparse.ArgumentParser(description='TM 경고와 7일 차단 기록')
parser.add_argument('action', choices=['check', 'strike'])
parser.add_argument('--user', required=True)
parser.add_argument('--ts')
parser.add_argument('--reason')
parser.add_argument('--path', type=Path, default=Path.home() / '.local/share/sanabi/tm-moderation.json')
args = parser.parse_args()
if not re.fullmatch(r'U[A-Z0-9]+', args.user):
    parser.error('Slack 사용자 ID가 필요해요.')
if args.action == 'strike' and (not args.ts or not args.reason):
    parser.error('경고에는 원본 메시지 ts와 비밀값을 제외한 사유가 필요해요.')
args.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
with args.path.with_suffix('.lock').open('a') as lock:
    os.chmod(lock.name, 0o600)
    fcntl.flock(lock, fcntl.LOCK_EX)
    data = json.loads(args.path.read_text()) if args.path.exists() else {}
    now = int(time.time())
    user = data.setdefault(args.user, {'count': 0, 'blocked_until': 0, 'events': []})
    if user['blocked_until'] and user['blocked_until'] <= now:
        user.update(count=0, blocked_until=0)
    duplicate = any(event['ts'] == args.ts for event in user['events'])
    blocked = user['blocked_until'] > now
    if args.action == 'strike' and not duplicate and not blocked:
        user['count'] += 1
        user['events'].append({'ts': args.ts, 'reason': args.reason, 'recorded_at': now})
        if user['count'] == 3:
            user['blocked_until'] = now + 7 * 24 * 60 * 60
    fd, temporary = tempfile.mkstemp(dir=args.path.parent, prefix='.tm-moderation-')
    try:
        with os.fdopen(fd, 'w') as output:
            json.dump(data, output, ensure_ascii=False, indent=2)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, args.path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print(json.dumps({'count': user['count'], 'blocked_until': user['blocked_until'],
                      'blocked': user['blocked_until'] > now, 'duplicate': duplicate}, ensure_ascii=False))
