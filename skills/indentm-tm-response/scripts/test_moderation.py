import concurrent.futures
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest


class ModerationTest(unittest.TestCase):
    def test_warning_duplicate_block_expiry_and_parallel_updates(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'records.json'
            script = Path(__file__).with_name('moderation.py')

            def call(action, user='U_TEST', ts=None):
                user = user.replace('_', '')
                command = [sys.executable, str(script), action, '--user', user, '--path', str(path)]
                if ts:
                    command += ['--ts', ts, '--reason', '테스트용 호스트 접근 요청']
                return json.loads(subprocess.check_output(command, text=True))

            self.assertFalse(call('check')['blocked'])
            self.assertEqual(call('strike', ts='1.0')['count'], 1)
            self.assertTrue(call('strike', ts='1.0')['duplicate'])
            self.assertEqual(call('strike', ts='2.0')['count'], 2)
            third = call('strike', ts='3.0')
            self.assertEqual(third['count'], 3)
            self.assertTrue(third['blocked'])
            self.assertAlmostEqual(third['blocked_until'] - time.time(), 604800, delta=3)
            self.assertEqual(call('strike', ts='4.0')['blocked_until'], third['blocked_until'])
            self.assertFalse(call('check', user='U_OTHER')['blocked'])
            records = json.loads(path.read_text())
            records['UTEST']['blocked_until'] = int(time.time()) - 1
            path.write_text(json.dumps(records))
            self.assertEqual(call('check')['count'], 0)
            self.assertEqual(call('strike', ts='5.0')['count'], 1)
            self.assertEqual(len(json.loads(path.read_text())['UTEST']['events']), 4)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            with concurrent.futures.ThreadPoolExecutor() as pool:
                list(pool.map(lambda n: call('strike', user='U_PARALLEL', ts=str(n)), range(6)))
            self.assertEqual(call('check', user='U_PARALLEL')['count'], 3)
            path.write_text('{')
            result = subprocess.run([sys.executable, str(script), 'check', '--user', 'UTEST',
                                     '--path', str(path)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(path.read_text(), '{')


if __name__ == '__main__':
    unittest.main()
