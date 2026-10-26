"""Exercise full, missing-manifest and incremental deploys without a network."""
import os, pathlib, subprocess, tempfile
root = pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as d:
    tmp = pathlib.Path(d)
    (tmp/'dist').mkdir()
    (tmp/'dist/index.html').write_text('new')
    (tmp/'dist/asset.js').write_text('asset')
    fake = tmp/'lftp'
    fake.write_text('''#!/usr/bin/env python3
import os, pathlib, re, sys
s = pathlib.Path(sys.argv[2]).read_text() if sys.argv[1] == '-f' else sys.argv[2]
with open(os.environ['CAPTURE'], 'a') as f: f.write(s + '\\n')
if '\\nget ' in s:
    if os.environ['CASE'] == 'missing': sys.exit(1)
    target = re.search(r' -o "([^"]+)"', s).group(1)
    pathlib.Path(target).write_text('0'*64+'  index.html\\n'+'1'*64+'  unrelated.txt\\n')
''')
    fake.chmod(0o755)
    for case in ('full','missing','incremental'):
        capture = tmp/(case+'.log')
        env = dict(os.environ, PATH=str(tmp)+os.pathsep+os.environ['PATH'],
                   HOST='ftp.example.test', FTP_USER='fixture', PASS='fixture', PORT='21',
                   REMOTE_DIR='/site', DIST=str(tmp/'dist'), CAPTURE=str(capture), CASE=case,
                   FULL_DEPLOY='true' if case=='full' else 'false')
        subprocess.run(['bash',str(root/'scripts/simply-hash-deploy.sh')],env=env,check=True)
        text = capture.read_text()
        assert 'set ssl:verify-certificate yes;' in text
        assert 'set ssl:check-hostname yes;' in text
        assert '--delete' not in text and '\nrm ' not in text
        assert 'unrelated.txt' not in text
        if case == 'incremental': assert text.index('asset.js') < text.rindex('index.html')
    print('PASS: verified FTPS and retention policy across all 3 deploy paths')
