"""Build an offline review document. Assets are embedded without modifying pixels."""
from pathlib import Path
import base64
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REFERENCE = Path('/tmp/codex-remote-attachments/01a08645-c62f-7993-ba84-b3ce3c5c46cb/155F9FD0-401F-4DCE-9E85-DAB1D5BFDE53/1-사진-1.jpg')
ANCHORS = {'olli': (391, 651), 'woni': (375, 622), 'danji': (392, 640), 'dalli': (414, 650), 'kori': (378, 642)}

def data_uri(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

assets = {}
for name, (center, feet) in ANCHORS.items():
    asset = ROOT / 'public/assets/characters/allone' / f'{name}.png'
    assets[name] = {'src': data_uri(asset, 'image/png'), 'center': center, 'feet': feet}

text = (HERE / 'template.html').read_text()
replacements = {
    '@@CSS@@': (HERE / 'review.css').read_text(),
    '@@JS@@': (HERE / 'review.js').read_text(),
    '@@DATA@@': json.dumps(json.loads((HERE / 'content.json').read_text()), ensure_ascii=False).replace('</', '<\\/'),
    '@@SELECTION@@': json.dumps(json.loads((HERE / 'selection.json').read_text()), ensure_ascii=False).replace('</', '<\\/'),
    '@@ASSETS@@': '<script type="application/json" id="character-assets">' + json.dumps(assets) + '</script>',
    '@@REFERENCE@@': data_uri(REFERENCE, 'image/jpeg'),
}
for marker, value in replacements.items():
    text = text.replace(marker, value)
assert '@@' not in text
for filename in ('index.html', 'board-design-review-v3.html'):
    (HERE / filename).write_text(text)
print(json.dumps({'output': str(HERE / 'index.html'), 'bytes': len(text.encode()), 'embedded_images': 6}, ensure_ascii=False))
