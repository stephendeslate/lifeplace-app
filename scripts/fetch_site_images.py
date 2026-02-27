#!/usr/bin/env python3
"""
Fetch all images from https://lifeplacealfonso.com

Crawls the homepage and linked internal pages, finds all image URLs
(img tags, CSS background images, srcset), and optionally downloads them.

Usage:
    python fetch_site_images.py                # List all image URLs
    python fetch_site_images.py --download     # Download all images to ./downloaded_images/
    python fetch_site_images.py --download -o ~/Desktop/images  # Custom output dir
"""

import argparse
import os
import re
import sys
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://lifeplacealfonso.com"
TIMEOUT = 15
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"}


def get_page(url: str) -> BeautifulSoup | None:
    try:
        resp = requests.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except requests.RequestException as e:
        print(f"  [!] Failed to fetch {url}: {e}", file=sys.stderr)
        return None


def extract_images_from_page(soup: BeautifulSoup, page_url: str) -> set[str]:
    images: set[str] = set()

    # 1. <img src="..."> and <img data-src="..."> (lazy-loaded)
    for img in soup.find_all("img"):
        for attr in ("src", "data-src", "data-lazy-src"):
            val = img.get(attr)
            if val:
                images.add(urljoin(page_url, val))

        # 2. srcset attribute (responsive images)
        srcset = img.get("srcset") or img.get("data-srcset")
        if srcset:
            for entry in srcset.split(","):
                parts = entry.strip().split()
                if parts:
                    images.add(urljoin(page_url, parts[0]))

    # 3. <source srcset="..."> inside <picture>
    for source in soup.find_all("source"):
        srcset = source.get("srcset")
        if srcset:
            for entry in srcset.split(","):
                parts = entry.strip().split()
                if parts:
                    images.add(urljoin(page_url, parts[0]))

    # 4. CSS background-image in inline styles
    for tag in soup.find_all(style=True):
        style = tag["style"]
        for match in re.findall(r'url\(["\']?(.*?)["\']?\)', style):
            images.add(urljoin(page_url, match))

    # 5. <a> tags linking directly to image files
    for a in soup.find_all("a", href=True):
        href = a["href"]
        parsed = urlparse(href)
        ext = os.path.splitext(parsed.path)[1].lower()
        if ext in IMAGE_EXTENSIONS:
            images.add(urljoin(page_url, href))

    # 6. og:image and other meta image tags
    for meta in soup.find_all("meta"):
        prop = meta.get("property", "") or meta.get("name", "")
        if "image" in prop.lower():
            content = meta.get("content")
            if content and content.startswith("http"):
                images.add(content)

    return images


def find_internal_links(soup: BeautifulSoup) -> set[str]:
    links: set[str] = set()
    base_domain = urlparse(BASE_URL).netloc
    for a in soup.find_all("a", href=True):
        href = a["href"]
        full_url = urljoin(BASE_URL, href)
        parsed = urlparse(full_url)
        if parsed.netloc == base_domain:
            clean = full_url.split("#")[0].split("?")[0].rstrip("/")
            links.add(clean)
    return links


def crawl_site() -> set[str]:
    all_images: set[str] = set()
    visited: set[str] = set()
    to_visit: set[str] = {BASE_URL}

    while to_visit:
        url = to_visit.pop()
        if url in visited:
            continue
        visited.add(url)

        print(f"  Crawling: {url}")
        soup = get_page(url)
        if soup is None:
            continue

        page_images = extract_images_from_page(soup, url)
        all_images.update(page_images)

        # Only follow internal links one level deep from homepage
        if url == BASE_URL:
            internal_links = find_internal_links(soup)
            to_visit.update(internal_links - visited)

    # Filter to only images hosted on the site itself
    base_domain = urlparse(BASE_URL).netloc
    site_images = set()
    for img_url in all_images:
        parsed = urlparse(img_url)
        ext = os.path.splitext(parsed.path)[1].lower()
        if ext in IMAGE_EXTENSIONS and parsed.netloc == base_domain:
            site_images.add(img_url)

    return site_images


def download_images(images: set[str], output_dir: str) -> None:
    os.makedirs(output_dir, exist_ok=True)
    total = len(images)

    for i, url in enumerate(sorted(images), 1):
        parsed = urlparse(url)
        # Preserve directory structure from URL path
        rel_path = parsed.path.lstrip("/")
        dest = os.path.join(output_dir, rel_path)
        dest_dir = os.path.dirname(dest)
        os.makedirs(dest_dir, exist_ok=True)

        if os.path.exists(dest):
            print(f"  [{i}/{total}] Already exists: {rel_path}")
            continue

        try:
            resp = requests.get(url, timeout=TIMEOUT)
            resp.raise_for_status()
            with open(dest, "wb") as f:
                f.write(resp.content)
            size_kb = len(resp.content) / 1024
            print(f"  [{i}/{total}] Downloaded ({size_kb:.0f} KB): {rel_path}")
        except requests.RequestException as e:
            print(f"  [{i}/{total}] Failed: {url} - {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description="Fetch all images from lifeplacealfonso.com"
    )
    parser.add_argument(
        "--download", action="store_true", help="Download images to disk"
    )
    parser.add_argument(
        "-o", "--output", default="./downloaded_images",
        help="Output directory for downloads (default: ./downloaded_images)",
    )
    args = parser.parse_args()

    print(f"Crawling {BASE_URL} for images...\n")
    images = crawl_site()

    print(f"\nFound {len(images)} unique images:\n")
    for url in sorted(images):
        print(f"  {url}")

    if args.download:
        print(f"\nDownloading to {args.output}...\n")
        download_images(images, args.output)
        print("\nDone!")


if __name__ == "__main__":
    main()
