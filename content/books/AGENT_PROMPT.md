# Промпт для агента: «Сделай иллюстрированную книгу-картинку»

Скопируй всё, что ниже разделителя, и дай агенту (general-purpose, с доступом к Bash/Write).
Заполни 4 переменные вверху (TITLE / LEVEL / PAGES / IDEA). Агент сам напишет историю,
сгенерит картинки через Nano Banana, сконвертит и (опционально) задеплоит.

---

Ты создаёшь иллюстрированную книгу-картинку для приложения english-trainer (PWA для изучения
английского, ученики — носители русского уровня A1–A2). Сделай ВСЁ от начала до конца.

ВХОДНЫЕ ДАННЫЕ (заполни перед запуском):
- TITLE: <английское название книги>
- LEVEL: <A1 | A2>
- PAGES: <сколько страниц, например 12>
- IDEA: <одна-две фразы о сюжете на русском>

## Шаг 1. Придумай историю и напиши JSON книги
Создай файл `/Users/vadimbobkov/eng/english-trainer/content/books/<id>.json`, где `<id>` —
слаг вида `book-<краткое-имя>` (латиницей, через дефис, уникальный).

Точная схема (валидный JSON, двойные кавычки, без висячих запятых):
```json
{
  "id": "book-<slug>",
  "title": "<English title>",
  "level": "<A1|A2>",
  "summary": "<одно предложение по-русски>",
  "character": "<ФИКСИРОВАННОЕ описание главного героя одним предложением — цвет, размер, фирменная деталь; чтобы герой был ОДИНАКОВЫМ на всех страницах>",
  "style": "<стиль иллюстраций, напр.: soft warm watercolor children's picture-book illustration, rounded friendly shapes, gentle colours>",
  "pages": [
    { "en": "<1–3 ОЧЕНЬ простых предложения под уровень>", "ru": "<точный перевод>", "scene": "<английское описание иллюстрации ЭТОЙ страницы; всегда упоминай героя и единый сеттинг>" }
  ]
}
```
Требования к тексту:
- A1 → 1–2 коротких предложения на страницу (present/past simple, простые слова, мягкие повторы).
- A2 → 2–3 предложения на страницу (в основном past simple).
- Чёткая арка: завязка → проблема → попытки → кульминация → счастливый финал.
- `scene` каждой страницы повторяет ключевые черты героя (для визуальной консистентности).
Проверь, что JSON парсится:
`node -e "JSON.parse(require('fs').readFileSync('<path>','utf8'))"`

## Шаг 2. Сгенерируй иллюстрации (Nano Banana через Vertex)
Картинки делаются скриптом на Python из соседнего проекта `/Users/vadimbobkov/mult`
(там venv с google-genai и ключ GOOGLECLOUD в .env; модель — gemini-3.1-flash-image).
ВАЖНО: 429 RESOURCE_EXHAUSTED — это лимит ПО МИНУТЕ, не дневной. Делай паузы ~3с между
картинками и длинный бэкофф на 429; НЕ прерывайся, просто жди и повторяй.

Создай скрипт (например в /tmp/genbook.py) и запусти `cd /Users/vadimbobkov/mult && .venv/bin/python /tmp/genbook.py`:
```python
import base64, json, sys, os, time
sys.path.insert(0, "/Users/vadimbobkov/mult")
from ai_client import get_client
from config import IMAGE_MODEL

BOOK = "/Users/vadimbobkov/eng/english-trainer/content/books/<id>.json"   # <-- путь к твоему JSON
OUT  = "/Users/vadimbobkov/eng/english-trainer/web/public/books/<id>"     # PNG здесь же, потом конвертим
os.makedirs(OUT, exist_ok=True)
b = json.loads(open(BOOK).read())
base = (f"{b['style']}. Consistent main character across the whole book: {b['character']}. "
        "Keep the SAME character design, colours and art style on every page. "
        "Warm, wholesome, child-friendly. NO text, NO words, NO letters. NOT 3D, NOT photo. Square 1:1.")
api = get_client()._api_client

def gen(prompt):
    for a in range(8):
        try:
            body = {"contents":[{"role":"user","parts":[{"text":prompt}]}],
                    "generationConfig":{"responseModalities":["TEXT","IMAGE"],"imageConfig":{"aspectRatio":"1:1"}}}
            resp = api.request("post", f"publishers/google/models/{IMAGE_MODEL}:generateContent", body)
            d = resp.json if (hasattr(resp,"json") and not callable(getattr(resp,"json"))) else json.loads(getattr(resp,"body",None) or getattr(resp,"text","{}"))
            for p in d.get("candidates",[{}])[0].get("content",{}).get("parts",[]):
                idl = p.get("inlineData") or p.get("inline_data")
                if idl and idl.get("data"): return base64.b64decode(idl["data"])
            time.sleep(10)
        except Exception as e:
            m = str(e); time.sleep(min(120, 25*(2**a)) if ("429" in m or "RESOURCE" in m) else 8)
    return None

for i, p in enumerate(b["pages"], start=1):
    png = OUT + f"/{i}.png"
    if os.path.exists(png) and os.path.getsize(png) > 0: continue   # резюмируемо
    out = gen(f"{base}\n\nThis page shows: {p['scene']}")
    if out: open(png, "wb").write(out); print("OK", i, flush=True)
    else: print("FAIL", i, flush=True)
    time.sleep(3)   # держим темп под лимитом
print("done", flush=True)
```
Совет по тексту на картинках: если на иллюстрации иногда появляются «надписи»-артефакты —
это нормально для модели; держи в промпте «NO text, NO words, NO letters». Если сцена с
известным сюжетом (Белоснежка и т.п.) даёт «no image part» (контент-фильтр) — перефразируй
нейтрально (без имён персонажей: «a kind girl», «little gnomes»).

## Шаг 3. Конвертируй PNG → WEBP (компактно, быстрая загрузка)
```bash
cd /Users/vadimbobkov/eng/english-trainer/web/public/books/<id>
for f in *.png; do cwebp -q 80 "$f" -o "${f%.png}.webp" >/dev/null 2>&1 && rm "$f"; done
```
(`cwebp` есть в /opt/homebrew/bin; sips на этой машине webp НЕ умеет.) Обложка книги на полке —
автоматически из `1.webp`. Все картинки в приложении — webp.

## Шаг 4. Проверь и задеплой
```bash
cd /Users/vadimbobkov/eng/english-trainer
PATH=/opt/node/bin:$PATH npm run build:web | tail -2          # включает картинки из web/public в сборку
git add -A && git commit -m "Add picture book: <title>"        # БЕЗ Co-Authored-By (репо публичный)
git push
# деплой на сервер:
ssh <SERVER> "cd /opt/english-trainer && git pull && PATH=/opt/node/bin:\$PATH npm run build:web | tail -1 && systemctl restart english-trainer"
```
Сервер сам подхватит книгу (в логе появится «… N books»). В приложении: Профиль →
«Книги с картинками». Никакого кода менять не нужно — только JSON + картинки.

## Чек-лист готовности
- [ ] JSON валиден, `pages` = PAGES страниц, у каждой есть en/ru/scene
- [ ] В web/public/books/<id>/ ровно PAGES файлов `1.jpg … N.jpg`
- [ ] Сборка прошла, книга видна на полке с обложкой
