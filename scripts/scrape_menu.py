"""Scrape the menu of the old vabenepizza.ru site into src/data/menu.json."""
import html, json, re, sys, urllib.request

CATS = [("pizza", "Пицца", ""), ("salads", "Салаты", "salaty/"), ("sides", "Гарниры", "garniry/"),
        ("starters", "Закуски", "zakuski/"), ("meat", "Горячее: мясо", "goryachie-blyuda-myaso/"),
        ("fish", "Горячее: рыба", "goryachie-blyuda-ryba/"), ("pasta", "Паста", "pasta/"),
        ("risotto", "Ризотто", "rizotto/"), ("soups", "Супы", "supy/"), ("breakfast", "Завтраки", "zavtraki/"),
        ("drinks", "Напитки", "napitki/"), ("desserts", "Десерты", "deserty/")]

def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

def clean_name(n):
    n = re.sub(r"^(НОВОЕ|-)\s*", "", n).strip()
    n = re.sub(r"\s*NEW$", "", n)
    return n[:1].upper() + n[1:]

out = []
for key, title, path in CATS:
    page = urllib.request.urlopen("https://vabenepizza.ru/" + path, timeout=30).read().decode("utf-8")
    items = []
    for block in page.split('<div class=product>')[1:]:
        name = re.search(r'<h3 class=title>(.*?)</h3>', block, re.S)
        if not name:
            continue
        raw = text(name.group(1))
        desc = re.search(r'<div class=shDescr>(.*?)</div>', block, re.S)
        img = re.search(r'<img src=([^ >]+)', block)
        sizes = re.findall(r'<div class=szTxt>(.*?)</div><div class=szPrc>(.*?)</div>', block, re.S)
        price = re.search(r'class=cst>([\d\s]+) р', block)
        item = {
            "name": clean_name(raw),
            "new": raw.startswith("НОВОЕ") or "NEW" in raw or 'class=dNew' in block,
            "desc": text(desc.group(1)).rstrip(",. ") if desc else "",
            "img": ("assets/menu/" + img.group(1).split("/")[-1]) if img and img.group(1).endswith(".jpg") else None,
        }
        if sizes:
            item["sizes"] = sorted(
                [{"label": text(a).rstrip("."), "price": int(re.sub(r"\D", "", b))} for a, b in sizes],
                key=lambda s: s["price"])
        else:
            item["price"] = int(re.sub(r"\D", "", price.group(1))) if price else None
        items.append(item)
    out.append({"id": key, "title": title, "items": items})
    print(title, len(items), file=sys.stderr)

json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
