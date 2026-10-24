#!/usr/bin/env python3
"""Refresh the diff-vs-upstream figure between the UPSTREAM-DIFF markers in README.md.

Measures committed state only (HEAD against the merge base with upstream/main),
so the figure names the commit it was taken at. Run after committing; the README
edit itself lands in the next commit, which is why the hash is printed.
"""
import re
import subprocess
import sys
from pathlib import Path

UPSTREAM_URL = "https://github.com/JuliusBrussee/caveman.git"
README = Path(__file__).resolve().parent.parent / "README.md"
START, END = "<!-- UPSTREAM-DIFF:START -->", "<!-- UPSTREAM-DIFF:END -->"


def git(*args):
    return subprocess.run(
        ["git", *args], check=True, capture_output=True, text=True, cwd=README.parent
    ).stdout.strip()


def ensure_upstream():
    if "upstream" not in git("remote").split():
        git("remote", "add", "upstream", UPSTREAM_URL)
    git("fetch", "-q", "upstream")


def count(stat, word):
    m = re.search(rf"(\d+) {word}", stat)
    return int(m.group(1)) if m else 0


def main():
    ensure_upstream()
    base = git("merge-base", "HEAD", "upstream/main")
    head = git("rev-parse", "--short=7", "HEAD")
    stat = git("diff", "--shortstat", base, "HEAD")
    line = (
        f"**{count(stat, 'file')} files changed, {count(stat, 'insertion')} insertions(+), "
        f"{count(stat, 'deletion')} deletions(-)** vs "
        f"[upstream]({UPSTREAM_URL.removesuffix('.git')}) at merge base `{base[:7]}`, "
        f"measured at `{head}`."
    )
    text = README.read_text(encoding="utf-8")
    pattern = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)
    if not pattern.search(text):
        sys.exit(f"markers {START} / {END} not found in {README.name}")
    new = pattern.sub(lambda _: f"{START}\n{line}\n{END}", text, count=1)
    if new != text:
        README.write_text(new, encoding="utf-8")
    print(line)


if __name__ == "__main__":
    main()
