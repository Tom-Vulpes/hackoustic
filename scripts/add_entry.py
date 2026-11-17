#!/usr/bin/env python3
"""Turn an approved GitHub issue-form submission into a data/*.json entry.

Reads ISSUE_BODY and ISSUE_LABELS from the environment (or --body-file/--labels).
Prints a one-line human-readable result (used as the issue comment).
"""
import argparse, json, os, re, sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

# Issue-form heading text (the `label:` in the template) -> field key
FIELDS = {
    "Name": "name", "Short bio": "bio", "Tags": "tags", "Location": "location",
    "Links": "links", "Image (optional)": "image",
    "Workshop title": "title", "Run by": "provider", "Date (optional)": "date",
    "Region": "region", "Format": "format", "Link": "url", "Description": "desc",
    "Category": "category", "Resource name": "title",
}

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]

def parse_body(body):
    out, key, buf = {}, None, []
    for line in body.replace("\r\n", "\n").split("\n"):
        m = re.match(r"^###\s+(.*\S)\s*$", line)
        if m:
            if key: out[key] = "\n".join(buf).strip()
            key, buf = FIELDS.get(m.group(1).strip(), m.group(1).strip()), []
        else:
            buf.append(line)
    if key: out[key] = "\n".join(buf).strip()
    return {k: ("" if v == "_No response_" else v) for k, v in out.items()}

def safe_url(u):
    u = (u or "").strip()
    return u if re.match(r"^https?://", u, re.I) else ""

def parse_image(text):
    m = (re.search(r"!\[[^\]]*\]\(([^)\s]+)\)", text or "")
         or re.search(r'<img[^>]+src="([^"]+)"', text or "")
         or re.search(r"(https?://\S+)", text or ""))
    return safe_url(m.group(1)) if m else ""

def parse_links(text):
    links = []
    for line in (text or "").splitlines():
        line = line.strip().lstrip("-* ").strip()
        if not line: continue
        if "|" in line:
            label, url = [x.strip() for x in line.split("|", 1)]
        else:
            label, url = "", line
        url = safe_url(url)
        if not url: continue
        if not label:
            label = re.sub(r"^www\.", "", re.sub(r"^https?://", "", url)).split("/")[0]
        links.append({"label": label, "url": url})
    return links

def load(name):
    p = DATA / (name + ".json")
    return p, json.loads(p.read_text(encoding="utf-8"))

def save(p, items):
    p.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def add(labels, f):
    labels = set(labels)
    if "new-practitioner" in labels:
        need = ["name", "bio", "links"]
        miss = [k for k in need if not f.get(k)]
        if miss: return False, "Missing required field(s): " + ", ".join(miss)
        links = parse_links(f["links"])
        if not links: return False, "No valid http(s) links found in Links."
        p, items = load("practitioners")
        pid = "p-" + slug(f["name"])
        if any(i["id"] == pid or i["name"].lower() == f["name"].strip().lower() for i in items):
            return False, f"'{f['name']}' is already in the practitioners directory."
        items.append({
            "id": pid, "name": f["name"].strip(),
            "tags": [t.strip().lower().replace(" ", "-") for t in f.get("tags", "").split(",") if t.strip()],
            "location": f.get("location", "").strip(), "image": parse_image(f.get("image")),
            "bio": f["bio"].strip(), "links": links})
        save(p, items)
        return True, f"Added **{f['name']}** to the Practitioners directory. It will be live in a minute or two."
    if "new-workshop" in labels:
        miss = [k for k in ["title", "provider", "location", "region", "format", "url", "desc"] if not f.get(k)]
        if miss: return False, "Missing required field(s): " + ", ".join(miss)
        url = safe_url(f["url"])
        if not url: return False, "Link must start with http:// or https://"
        date = f.get("date", "").strip()
        if date and not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            return False, "Date must be YYYY-MM-DD (or blank)."
        p, items = load("workshops")
        wid = "w-" + slug(f["provider"] + " " + f["title"] + " " + date)
        if any(i["id"] == wid or i["url"] == url and i.get("date", "") == date for i in items):
            return False, "That workshop is already listed."
        items.append({"id": wid, "title": f["title"].strip(), "provider": f["provider"].strip(), "date": date,
                      "location": f["location"].strip(), "region": f["region"].strip(),
                      "format": f["format"].strip(), "url": url, "desc": f["desc"].strip()})
        save(p, items)
        return True, f"Added workshop **{f['title']}**. It will be live in a minute or two."
    if "new-resource" in labels:
        miss = [k for k in ["title", "url", "category", "desc"] if not f.get(k)]
        if miss: return False, "Missing required field(s): " + ", ".join(miss)
        url = safe_url(f["url"])
        if not url: return False, "Link must start with http:// or https://"
        p, items = load("resources")
        if any(i["url"].rstrip("/") == url.rstrip("/") for i in items):
            return False, "That link is already in the resources list."
        n = max([int(re.sub(r"\D", "", i["id"]) or 0) for i in items] + [0]) + 1
        items.append({"id": f"r-{n}", "title": f["title"].strip(), "url": url,
                      "category": f["category"].strip(), "desc": f["desc"].strip()})
        save(p, items)
        return True, f"Added resource **{f['title']}**. It will be live in a minute or two."
    return False, "Issue has no new-practitioner / new-workshop / new-resource label."

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--body-file"); ap.add_argument("--labels")
    a = ap.parse_args()
    body = Path(a.body_file).read_text() if a.body_file else os.environ.get("ISSUE_BODY", "")
    labels = (a.labels or os.environ.get("ISSUE_LABELS", "")).split(",")
    ok, msg = add([l.strip() for l in labels], parse_body(body))
    print(msg if ok else "Could not add this entry: " + msg + " Edit the issue and re-apply the `approved` label.")
    return 0  # failures are reported in the issue comment, not as a failed run

if __name__ == "__main__":
    sys.exit(main())
