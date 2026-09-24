#!/usr/bin/env python3
"""Ghép các file trong src/ thành một trang HTML duy nhất.

    python3 build.py                    # tạo index.html (trang đầy đủ, mở trực tiếp hoặc đưa lên GitHub Pages)
    python3 build.py --fragment out.html  # tạo thêm bản không có <head>/<body> để đăng làm Claude Artifact
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
SCRIPTS = ["words.js", "core.js", "views.js", "practice.js", "ai.js"]

TITLE = "<title>Vở Từ Vựng</title>"
FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700'
    '&family=Gentium+Book+Plus:ital,wght@0,400;0,700;1,400&display=swap">'
)


def read(name):
    return (SRC / name).read_text(encoding="utf-8")


def parts():
    style = "<style>\n" + read("style.css") + "</style>"
    body = read("body.html")
    script = "<script>\n\"use strict\";\n" + "\n".join(read(s) for s in SCRIPTS) + "</script>"
    return style, body, script


def full_page():
    style, body, script = parts()
    return "\n".join([
        "<!doctype html>",
        '<html lang="vi">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        TITLE,
        FONTS,
        style,
        "</head>",
        "<body>",
        body,
        script,
        "</body>",
        "</html>",
        "",
    ])


def fragment():
    style, body, script = parts()
    return "\n".join([TITLE, FONTS, style, body, script, ""])


if __name__ == "__main__":
    (ROOT / "index.html").write_text(full_page(), encoding="utf-8")
    print("Đã tạo index.html")
    if len(sys.argv) == 3 and sys.argv[1] == "--fragment":
        pathlib.Path(sys.argv[2]).write_text(fragment(), encoding="utf-8")
        print("Đã tạo", sys.argv[2])
