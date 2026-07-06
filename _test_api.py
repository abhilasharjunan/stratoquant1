import json, sys

data = json.load(sys.stdin.buffer)
cats = list(data.keys())
print("Categories:", cats)
print("Total categories:", len(cats))
for c in cats:
    funds = data.get(c, [])
    print(f"  {c}: {len(funds)} funds")
    if funds:
        f = funds[0]
        ret = f.get("returns", {})
        print(f"    First: {f.get('schemeName','?')} | NAV: {f.get('nav','?')} | 3Y: {ret.get('3Y','?')}")
