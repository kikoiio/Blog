#!/usr/bin/env python
# Capture the MyCode TUI running under ConPTY and render frames to SVG files.
import os, re, sys, time, threading, unicodedata, subprocess
from winpty import PtyProcess
import pyte

# CP437/CP850 graphics bytes that conhost emits for box-drawing chars when the
# console output codepage is a legacy OEM CP instead of UTF-8.
CP437_MAP = {
    0xB3: "│", 0xC4: "─", 0xDA: "┌", 0xBF: "┐", 0xC0: "└", 0xD9: "┘",
    0xC3: "├", 0xB4: "┤", 0xC2: "┬", 0xC1: "┴", 0xC5: "┼",
    0xD5: "╒", 0xD1: "╤", 0xD2: "╓", 0xD3: "╘", 0xBE: "╛", 0xD4: "╞",
    0xB8: "╕", 0xCC: "╞", 0xB9: "║", 0xCD: "═", 0xC9: "╔", 0xBB: "╗",
    0xC8: "╚", 0xBC: "╝", 0xB0: "░", 0xB1: "▒", 0xB2: "▓", 0xDB: "█",
    0xDC: "▄", 0xDF: "▀", 0xFE: "■", 0xFA: "·", 0xF9: "∙", 0x07: "•",
}

def decode_console(data: bytes) -> str:
    """Decode ConPTY output tolerating mixed encodings: UTF-8 sequences are
    decoded as UTF-8, legacy CP437 graphics bytes map to box chars, and any
    remaining high-byte pairs fall back to GBK."""
    out = []
    i, n = 0, len(data)
    while i < n:
        b = data[i]
        if b < 0x80:
            out.append(chr(b))
            i += 1
            continue
        if b in CP437_MAP:
            out.append(CP437_MAP[b])
            i += 1
            continue
        # try UTF-8 multibyte
        need = (2 if 0xC0 <= b < 0xE0 else
                3 if 0xE0 <= b < 0xF0 else
                4 if 0xF0 <= b < 0xF8 else 0)
        if need and i + need <= n and all(
                0x80 <= data[i + k] < 0xC0 for k in range(1, need)):
            try:
                out.append(data[i:i + need].decode("utf-8"))
                i += need
                continue
            except UnicodeDecodeError:
                pass
        # GBK pair fallback
        if 0x81 <= b <= 0xFE and i + 1 < n and 0x40 <= data[i + 1] <= 0xFE \
                and data[i + 1] != 0x7F:
            try:
                out.append(data[i:i + 2].decode("gbk"))
                i += 2
                continue
            except UnicodeDecodeError:
                pass
        out.append("")
        i += 1
    return "".join(out)

PROJECT = r"D:\Desktop\My_Projects\SWE_agent\reference\myCode"
OUT_DIR = os.path.join(PROJECT, "docs", "screenshots")
COLS, ROWS = 112, 48

NAMED = {
    "black": "#3f4451", "red": "#e06c75", "green": "#98c379", "yellow": "#d19a66",
    "blue": "#61afef", "magenta": "#c678dd", "cyan": "#56b6c2", "white": "#abb2bf",
    "brightblack": "#5c6370", "brightred": "#e06c75", "brightgreen": "#98c379",
    "brightyellow": "#d19a66", "brightblue": "#61afef", "brightmagenta": "#c678dd",
    "brightcyan": "#56b6c2", "brightwhite": "#ffffff",
}
FG_DEFAULT = "#d8dee9"
BG_DEFAULT = "#20242c"
FONT = "Consolas, 'Cascadia Mono', 'Courier New', monospace"
FONT_SIZE = 14
CHAR_W = 8.45
LINE_H = 18.5
PAD = 12
TITLE_H = 30

SYNC_RE = re.compile(rb"\x1b\[\?2026(?:;\d+)?[hl]")

def to_hex(v, default):
    if not v or v == "default":
        return default
    if v in NAMED:
        return NAMED[v]
    if re.fullmatch(r"[0-9a-fA-F]{6}", v):
        return "#" + v
    return default

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def render_svg(screen, path, title, extra_lines=None):
    """Render pyte screen buffer to an SVG that looks like a terminal window."""
    rows = []
    n_rows = screen.lines
    for y in range(n_rows):
        buf = screen.buffer.get(y, {})
        cells = []
        for x in sorted(buf.keys()):
            c = buf[x]
            if c.data == "" or c.data == "\0":
                continue
            cells.append((x, c))
        rows.append(cells)
    # crop trailing blank rows (incl. rows Ink cleared by writing spaces)
    def row_blank(cells):
        return all(c.data.strip() == "" for _, c in cells)
    while len(rows) > 8 and row_blank(rows[-1]):
        rows.pop()
    n_rows = len(rows)

    body_h = n_rows * LINE_H
    width = int(COLS * CHAR_W + 2 * PAD)
    height = int(TITLE_H + PAD + body_h + PAD)

    parts = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
                 f'viewBox="0 0 {width} {height}" font-family="{FONT}" font-size="{FONT_SIZE}">')
    parts.append(f'<rect x="0" y="0" width="{width}" height="{height}" rx="10" fill="{BG_DEFAULT}"/>')
    # title bar
    parts.append(f'<rect x="0" y="0" width="{width}" height="{TITLE_H}" rx="10" fill="#2b303b"/>')
    parts.append(f'<rect x="0" y="{TITLE_H-10}" width="{width}" height="10" fill="#2b303b"/>')
    for i, col in enumerate(("#ff5f57", "#febc2e", "#28c840")):
        parts.append(f'<circle cx="{20 + i*20}" cy="{TITLE_H/2}" r="6" fill="{col}"/>')
    parts.append(f'<text x="{width/2}" y="{TITLE_H/2 + 5}" fill="#9aa3b2" font-size="12" '
                 f'text-anchor="middle">{esc(title)}</text>')

    y0 = TITLE_H + PAD
    for y, cells in enumerate(rows):
        if not cells:
            continue
        line_y = y0 + y * LINE_H
        baseline = line_y + LINE_H * 0.72
        # merge runs of identical style
        runs = []
        for x, c in cells:
            fg = to_hex(c.fg, FG_DEFAULT)
            bg = to_hex(c.bg, "none")
            if getattr(c, "reverse", False):
                fg, bg = (BG_DEFAULT if bg == "none" else bg), FG_DEFAULT if fg == FG_DEFAULT else fg
                if fg == BG_DEFAULT and bg == "none":
                    bg = FG_DEFAULT
            style = (fg, bg, bool(c.bold), bool(getattr(c, "italics", False)),
                     bool(getattr(c, "underscore", False)))
            if runs and runs[-1][2] == style and runs[-1][1] + run_cell_len(runs[-1][0]) == x:
                runs[-1][0].append((x, c.data))
            else:
                runs.append(([ (x, c.data) ], x, style))
        for chars, start_x, (fg, bg, bold, ital, under) in runs:
            text = "".join(d for _, d in chars)
            if not text.strip():
                continue
            tx = PAD + start_x * CHAR_W
            if bg != "none":
                w = run_cell_len(chars) * CHAR_W
                parts.append(f'<rect x="{tx:.1f}" y="{line_y:.1f}" width="{w:.1f}" height="{LINE_H:.1f}" fill="{bg}"/>')
            attrs = f'fill="{fg}"'
            if bold:
                attrs += ' font-weight="bold"'
            if ital:
                attrs += ' font-style="italic"'
            if under:
                attrs += ' text-decoration="underline"'
            # pin the run to the terminal cell grid so glyph advance drift
            # (proportional fonts, CJK width) can't overflow the window
            cell_len = run_cell_len(chars)
            if len(chars) > 1:
                attrs += f' textLength="{cell_len * CHAR_W:.1f}" lengthAdjust="spacing"'
            parts.append(f'<text x="{tx:.1f}" y="{baseline:.1f}" {attrs} xml:space="preserve">{esc(text)}</text>')
    if extra_lines:
        pass
    parts.append('</svg>')
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))
    print(f"[svg] {path}")

def run_cell_len(chars):
    total = 0
    for _, d in chars:
        total += 2 if unicodedata.east_asian_width(d) in ("W", "F") else 1
    return max(total, 1)

class Capture:
    def __init__(self, argv, title):
        self.screen = pyte.Screen(COLS, ROWS)
        self.stream = pyte.Stream(self.screen)
        self.lock = threading.Lock()
        self.title = title
        # Write argv to a temp .cmd so we can set the console to UTF-8 (chcp 65001)
        # without the Chinese prompt/arguments passing through cmd.exe's GBK argv
        # parsing (which would mangle them).
        self._cmdfile = os.path.join(
            os.environ.get("TEMP", "."), f"mycode_cap_{os.getpid()}_{int(time.time()*1000)}.cmd")
        with open(self._cmdfile, "w", encoding="utf-8") as f:
            f.write("@echo off\r\nchcp 65001>nul\r\n")
            f.write(" ".join('"' + a.replace('"', '\\"') + '"' for a in argv) + "\r\n")
        env = dict(os.environ)
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        env["FORCE_COLOR"] = "3"
        env["PYTHONIOENCODING"] = "utf-8"
        self.proc = PtyProcess.spawn(["cmd", "/c", self._cmdfile],
                                     cwd=PROJECT, dimensions=(ROWS, COLS), env=env)
        self.alive = True
        self._pending = b""
        self.thread = threading.Thread(target=self._reader, daemon=True)
        self.thread.start()

    def _reader(self):
        while self.alive:
            try:
                data = self.proc.read(4096)
            except EOFError:
                break
            except Exception:
                break
            if not data:
                break
            if isinstance(data, str):
                data = data.encode("utf-8", "replace")
            data = SYNC_RE.sub(b"", data)
            data = self._pending + data
            # hold back an incomplete trailing UTF-8 sequence split across reads
            n = len(data)
            cut = n
            i = n - 1
            while i >= 0 and i > n - 4 and (data[i] & 0xC0) == 0x80:
                i -= 1
            if i >= 0 and i > n - 5 and (data[i] & 0x80):
                lead = data[i]
                need = (2 if (lead & 0xE0) == 0xC0 else
                        3 if (lead & 0xF0) == 0xE0 else
                        4 if (lead & 0xF8) == 0xF0 else 1)
                if need > 1 and n - i < need:
                    cut = i
            self._pending = data[cut:]
            text = decode_console(data[:cut])
            with self.lock:
                try:
                    self.stream.feed(text)
                except Exception:
                    pass

    def text(self):
        with self.lock:
            return "\n".join(self.screen.display)

    def write(self, s):
        self.proc.write(s)

    def wait_stable(self, quiet_s=3.0, timeout=180.0, must_contain=None, min_elapsed=0.0):
        """Wait until the screen text contains marker and stops changing."""
        t0 = time.time()
        last = None
        last_change = time.time()
        while time.time() - t0 < timeout:
            cur = self.text()
            if cur != last:
                last = cur
                last_change = time.time()
            quiet = time.time() - last_change
            elapsed = time.time() - t0
            if quiet >= quiet_s and elapsed >= min_elapsed:
                if must_contain is None or must_contain in cur:
                    return cur
            time.sleep(0.3)
        return self.text()

    def save(self, name):
        with self.lock:
            render_svg(self.screen, os.path.join(OUT_DIR, name), self.title)

    def close(self):
        self.alive = False
        try:
            self.proc.terminate(force=True)
        except Exception:
            pass
        try:
            os.unlink(self._cmdfile)
        except Exception:
            pass
        # the .cmd wrapper orphans the bun child — kill leftovers by command line
        subprocess.run(
            ["wmic", "process", "where",
             "name='bun.exe' and commandline like '%src\\\\main.tsx%'",
             "call", "terminate"],
            capture_output=True)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    cap = Capture(["bun", "run", "src/main.tsx"], "MyCode  -  bun run src/main.tsx")
    try:
        # Phase 1: home screen
        cap.wait_stable(quiet_s=3.0, timeout=120, must_contain="MyCode v0.1.0")
        time.sleep(1.0)
        cap.save("run-home.svg")

        # Phase 2: /help
        cap.write("/help\r")
        cap.wait_stable(quiet_s=2.5, timeout=30, must_contain="/help")
        time.sleep(0.8)
        cap.save("run-help.svg")

        # Phase 2.5: /clear so the task screenshots are clean
        cap.write("/clear\r")
        cap.wait_stable(quiet_s=1.5, timeout=15, must_contain="MyCode v0.1.0")
        time.sleep(0.5)

        # Phase 3: real task with tool use
        prompt = "用 Glob 工具列出 src/tools 目录下的所有 .ts 文件，然后一句话告诉我一共有几个"
        cap.write(prompt)
        time.sleep(0.3)
        cap.write("\r")
        # in-progress capture: grab the streaming state early (spinner / first tool)
        time.sleep(1.5)
        t0 = time.time()
        captured_running = False
        while time.time() - t0 < 120:
            txt = cap.text()
            if "●" in txt or "✓" in txt or re.search(r"[⠀-⣿✻]", txt):
                cap.save("run-task-running.svg")
                captured_running = True
                print(f"[phase3] running-state captured at {time.time()-t0:.1f}s")
                break
            time.sleep(0.4)
        if not captured_running:
            cap.save("run-task-running.svg")
            print("[phase3] running-state fallback capture")
        # wait for completion: screen quiet for 6s and at least 15s elapsed
        cap.wait_stable(quiet_s=6.0, timeout=240, min_elapsed=15.0)
        cap.save("run-task-done.svg")
        done_txt = cap.text()
        print("[phase3] done; screen tail:")
        for line in [l for l in done_txt.split("\n") if l.strip()][-8:]:
            print("   |", line.rstrip()[:100].encode("ascii", "backslashreplace").decode())

        # Phase 4: quit
        cap.write("/quit\r")
        time.sleep(2.0)
    finally:
        cap.close()

    # Print-mode capture (separate process, scrollback kept)
    pm = pyte.HistoryScreen(COLS, 24)
    pm_stream = pyte.Stream(pm)
    env = dict(os.environ); env["TERM"] = "xterm-256color"; env["COLORTERM"] = "truecolor"
    cmdfile = os.path.join(os.environ.get("TEMP", "."), f"mycode_pm_{os.getpid()}.cmd")
    with open(cmdfile, "w", encoding="utf-8") as f:
        f.write("@echo off\r\nchcp 65001>nul\r\n")
        f.write('bun run src/main.tsx -p "用一句话介绍 MyCode 的 Agent 执行循环"\r\n')
    proc = PtyProcess.spawn(["cmd", "/c", cmdfile],
                            cwd=PROJECT, dimensions=(24, COLS), env=env)
    t0 = time.time()
    while time.time() - t0 < 120:
        try:
            data = proc.read(4096)
        except Exception:
            break
        if not data:
            break
        if isinstance(data, str):
            data = data.encode("utf-8", "replace")
        data = SYNC_RE.sub(b"", data)
        data = decode_console(data)
        try:
            pm_stream.feed(data)
        except Exception:
            pass
        if not proc.isalive():
            # drain remaining
            continue
    try:
        proc.terminate(force=True)
    except Exception:
        pass
    # render history + screen: top lines first
    hist_lines = []
    for line in pm.history.top:
        hist_lines.append(line)
    # Build a combined pseudo-screen: reuse render by drawing into a tall screen
    all_lines = list(pm.history.top) + [pm.buffer.get(y, {}) for y in range(pm.lines)]
    # find last non-empty line
    def line_text(buf):
        return "".join(buf[x].data for x in sorted(buf.keys())).rstrip()
    while all_lines and not line_text(all_lines[-1]):
        all_lines.pop()
    while all_lines and not line_text(all_lines[0]):
        all_lines.pop(0)
    n = max(len(all_lines), 1)
    tall = pyte.Screen(COLS, n)
    tall.buffer.clear()
    for y, buf in enumerate(all_lines):
        tall.buffer[y] = dict(buf)
    render_svg(tall, os.path.join(OUT_DIR, "run-print-mode.svg"),
               'bun run src/main.tsx -p "用一句话介绍 MyCode 的 Agent 执行循环"')
    print("ALL DONE")

if __name__ == "__main__":
    main()
