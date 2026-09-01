import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_chat(prompt):
    data = json.dumps({'patient_id': 'user_11', 'message': prompt}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/chat/message', data=data, headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    out = json.loads(res.read().decode('utf-8'))
    print(f'============================================================')
    print(f'=== PROMPT: "{prompt}" ===')
    print(f'Intent: {out["intent"]} | Source: {out["source_type"]}')
    print('Content:\n' + out['content'])
    print('\nCitations count:', len(out['citations']))
    for c in out.get('citations', []):
        print('  • Citation:', c.get('document_name'), '|', c.get('section'))
    print('============================================================\n')

if __name__ == '__main__':
    test_chat("what clinical steps to be taken for my reports")
    test_chat("What should I do next based on my kidney reports?")
