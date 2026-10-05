import json
from pathlib import Path

root=Path(__file__).resolve().parents[4]
base=root/'apps/pos/.next-cloud'
traces=list(base.rglob('*.nft.json'));bad=0;count=0
for trace in traces:
    for entry in json.loads(trace.read_text(encoding='utf-8'))['files']:
        count+=1
        parts=(trace.parent/entry).resolve().parts
        if any(part=='.runtime' or part.startswith('.env') for part in parts):bad+=1
js=list((base/'static').rglob('*.js'))
symbols=['DATABASE_URL','QATU_GUEST_CODE_KEY_BASE64','staff_memberships','password_salt']
leaks=0
for source in js:
    text=source.read_text(encoding='utf-8')
    leaks+=sum(symbol in text for symbol in symbols)
private_assets=sum(source.suffix in ['.key','.pem','.qatubak','.exe'] for source in (base/'static').rglob('*') if source.is_file())
report={'passed':bool(traces) and bool(js) and bad==0 and leaks==0 and private_assets==0,'trace_manifests':len(traces),'trace_entries':count,'browser_js':len(js),'private_runtime_or_env_in_trace':bad,'server_symbols_in_browser':leaks,'private_static_assets':private_assets}
(Path(__file__).parent/'artifact-scan.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
if not report['passed']:raise SystemExit(1)
