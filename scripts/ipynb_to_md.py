"""One-off: Jupyter notebook -> Hugo-friendly Markdown (no jupyter dependency)."""
from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path


def cell_source(cell: dict) -> str:
    s = cell.get("source", [])
    return "".join(s) if isinstance(s, list) else str(s)


def format_output_text(o: dict, img_counter: list[int], out_dir: Path, stem: str) -> list[str]:
    lines: list[str] = []
    ot = o.get("output_type")
    if ot == "stream":
        text = "".join(o.get("text", []))
        if text.strip():
            lines.extend(["", "```text", text.rstrip(), "```"])
        return lines
    if ot == "error":
        ename = o.get("ename", "")
        evalue = o.get("evalue", "")
        tb = "\n".join(o.get("traceback", []))
        body = f"{ename}: {evalue}\n{tb}".rstrip()
        lines.extend(["", "```text", body, "```"])
        return lines
    if ot in ("execute_result", "display_data"):
        data = o.get("data", {})
        if "image/png" in data:
            raw = data["image/png"]
            if isinstance(raw, list):
                raw = "".join(raw)
            b = base64.b64decode(raw)
            img_counter[0] += 1
            name = f"{stem}_out_{img_counter[0]}.png"
            Path(out_dir / name).write_bytes(b)
            lines.extend(["", f"![]({name})"])
            return lines
        if "text/plain" in data:
            plain = data["text/plain"]
            plain = "".join(plain) if isinstance(plain, list) else str(plain)
            if plain.strip():
                lines.extend(["", "```text", str(plain).rstrip(), "```"])
        return lines
    return lines


def convert(nb_path: Path, title: str | None, date: str | None) -> None:
    nb = json.loads(nb_path.read_text(encoding="utf-8"))
    out_dir = nb_path.parent
    stem = nb_path.stem
    img_counter = [0]
    attach_count = [0]
    body_lines: list[str] = []

    for cell in nb.get("cells", []):
        ct = cell.get("cell_type")
        if ct == "markdown":
            text = cell_source(cell)
            for fname, payload in (cell.get("attachments") or {}).items():
                for mime, raw in payload.items():
                    if mime != "image/png":
                        continue
                    if isinstance(raw, list):
                        raw = "".join(raw)
                    b = base64.b64decode(raw)
                    (out_dir / fname).write_bytes(b)
                    attach_count[0] += 1
                text = text.replace(f"](attachment:{fname})", f"]({fname})")
            body_lines.append(text.rstrip())
            body_lines.append("")
        elif ct == "code":
            src = cell_source(cell).rstrip()
            body_lines.append("```python")
            body_lines.append(src)
            body_lines.append("```")
            for o in cell.get("outputs", []):
                body_lines.extend(format_output_text(o, img_counter, out_dir, stem))
            body_lines.append("")

    # Remove trailing empty code blocks
    cleaned: list[str] = []
    for line in body_lines:
        cleaned.append(line)
    # Strip empty fenced blocks (```python\n```)
    final: list[str] = []
    i = 0
    while i < len(cleaned):
        if (cleaned[i].startswith("```python") and
                i + 1 < len(cleaned) and cleaned[i + 1] == "```"):
            i += 2  # skip empty block
            if i < len(cleaned) and cleaned[i] == "":
                i += 1  # skip trailing blank
            continue
        final.append(cleaned[i])
        i += 1

    body = "\n".join(final).rstrip() + "\n"

    fm_title = title or stem
    fm_date = date or "2026-03-21"
    header = f"---\ntitle: {json.dumps(fm_title, ensure_ascii=False)}\ndate: {fm_date}\ndraft: false\n---\n\n"

    out_md = out_dir / "index.md"
    out_md.write_text(header + body, encoding="utf-8")
    n_img = img_counter[0] + attach_count[0]
    print(f"Wrote {out_md} ({n_img} images: {attach_count[0]} attach, {img_counter[0]} output)")
    print(f"Note: output is index.md (Hugo leaf bundle). Place .ipynb and images in a named folder under content/post/.")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("notebook", type=Path)
    p.add_argument("--title", default=None)
    p.add_argument("--date", default=None)
    args = p.parse_args()
    convert(args.notebook.expanduser().resolve(), args.title, args.date)


if __name__ == "__main__":
    main()
