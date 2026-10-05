import json
import re
from pathlib import Path
from jsonschema import Draft202012Validator

root = Path(__file__).resolve().parents[4]
run = Path(__file__).parent
order = json.loads((run / 'work-order.json').read_text(encoding='utf-8-sig'))
schema = json.loads((root.parent / 'specs/003-construccion-coordinada/contracts/work-order.schema.json').read_text(encoding='utf-8-sig'))
Draft202012Validator(schema).validate(order)
feature = root / order['feature_directory']
spec = (feature / 'spec.md').read_text(encoding='utf-8')
tasks = (feature / 'tasks.md').read_text(encoding='utf-8')
assert all(i in tasks for i in order['task_ids'])
assert all(i in spec for i in order['requirements'] + order['acceptance'])
documents = list(feature.rglob('*.md'))
checked_links = 0
for doc in documents:
    for target in re.findall(r'\]\(([^)]+)\)', doc.read_text(encoding='utf-8')):
        if target.startswith(('https:', 'http:', '#')):
            continue
        assert (doc.parent / target.split('#', 1)[0]).resolve().is_file(), (doc.name, target)
        checked_links += 1
assert order['owner'] == 'root' and order['reviewer'] != 'root'
report = {'passed': True, 'schema': 'WorkOrder1.0.0', 'order_version': order['version'], 'documents': len(documents), 'links': checked_links, 'requirements': len(order['requirements']), 'acceptance': len(order['acceptance']), 'qualified_tasks': len(order['task_ids']), 'independent_acceptance': False}
(run / 'document-check.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
