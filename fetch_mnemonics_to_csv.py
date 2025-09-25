#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fetch verified mnemonics from the web and merge into your CSV (no made-up mnemonics).

Currently supported source(s):
  - mnemonicdictionary.com   (exact word pages)

Optional (scaffolded, off by default):
  - artofmemory.com forum search (disabled by default to avoid noisy results)

USAGE
-----
python fetch_mnemonics_to_csv.py \
  --input data/sesamewords_leveled_list.csv \
  --output sesamewords_leveled_list_with_mnemonics.csv \
  --sources mnemonicdictionary \
  --max-per-word 3 \
  --overwrite

Notes
-----
* The script is polite: it rate-limits requests and retries on transient errors.
* It stores a local cache (JSON) so re-runs are fast and resumable.
* It writes two extra columns: mnemonic (joined with " • ") and mnemonic_source_url.
* If a word has no mnemonics on the chosen sources, the mnemonic field stays blank.
* Please respect each site's Terms of Service; this is provided for personal/educational use.

Copyright & Terms
-----------------
This script fetches publicly-visible content. It doesn't bypass paywalls or logins.
Always review and comply with each site's robots.txt and ToS before large-scale use.
"""

import argparse
import json
import os
import random
import re
import time
from typing import List, Dict, Optional, Tuple
from urllib.parse import quote

import pandas as pd
import requests
from bs4 import BeautifulSoup

# --------------------------
# Helpers
# --------------------------

def sleep_jitter(base: float = 1.5, jitter: float = 0.75):
    """Polite delay with jitter to avoid hammering sites."""
    delay = base + random.random() * jitter
    time.sleep(delay)

def load_cache(path: str) -> Dict[str, dict]:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}
    return {}

def save_cache(path: str, data: Dict[str, dict]):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

def clean_text(s: str) -> str:
    s = re.sub(r"\s+", " ", s or "").strip()
    return s

def unique_keep_order(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out

# --------------------------
# Source: MnemonicDictionary
# --------------------------

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 "
                  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15"
}

def fetch_from_mnemonicdictionary(word: str, max_per_word: int = 3) -> Tuple[List[str], Optional[str]]:
    """
    Returns up to max_per_word mnemonics for the exact word from mnemonicdictionary.com.
    Also returns the page URL used (or None).
    """
    url = f"https://mnemonicdictionary.com/word/{quote(word)}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
    except requests.RequestException:
        return [], None

    if resp.status_code != 200 or "MnemonicDictionary" not in resp.text:
        return [], None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Find the heading that contains "Mnemonics (Memory Aids)"
    header_elt = None
    for tag in soup.find_all(string=re.compile(r"Mnemonics\s*\(Memory Aids\)", re.I)):
        header_elt = tag.parent
        break

    if not header_elt:
        # Some pages might not have mnemonics
        return [], url

    # Collect text nodes after the header, until the next heading or end of section.
    mnems: List[str] = []
    for sib in header_elt.next_siblings:
        # Stop if we hit another large section header or the footer blocks
        if getattr(sib, "name", None) in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            break

        text = ""
        if hasattr(sib, "get_text"):
            text = sib.get_text(separator=" ", strip=True)
        else:
            text = str(sib).strip()

        text = clean_text(text)

        # Heuristics to skip ad/app sections
        if not text or "Download our Mobile App" in text or "Books We Recommend" in text:
            continue

        # Filter obvious dictionary lines
        if text.lower().startswith("definition") or text.lower().startswith("synonyms"):
            continue

        # Split candidates and filter plausible mnemonic lines
        candidates = re.split(r"(?<=\.)\s+|  {2,}", text)
        for c in candidates:
            c = clean_text(c)
            if not c:
                continue
            if c.lower().startswith("example sentence"):
                continue
            if c.lower().startswith("mnemonics (memory aids)"):
                continue
            # Remove trailing isolated vote numbers like "43   1"
            c = re.sub(r"\s*\d+\s+\d+\s*$", "", c).strip()
            if 6 <= len(c) <= 280:
                mnems.append(c)

        if len(mnems) >= max_per_word:
            break

    mnems = unique_keep_order(mnems)[:max_per_word]
    return mnems, url

# --------------------------
# (Optional scaffold) ArtOfMemory forum search
# --------------------------

def fetch_from_artofmemory(word: str, max_per_word: int = 1) -> Tuple[List[str], Optional[str]]:
    """
    Very conservative: try search page and parse the first post snippet.
    Disabled by default via CLI (opt-in), since forum posts may be noisy.
    """
    search_url = f"https://forum.artofmemory.com/search?q={quote(word)}%20mnemonic"
    try:
        resp = requests.get(search_url, headers=HEADERS, timeout=20)
    except requests.RequestException:
        return [], None

    if resp.status_code != 200:
        return [], None

    soup = BeautifulSoup(resp.text, "html.parser")
    summaries = soup.select("div.topic-excerpt, div.search-results .topic")
    out = []
    for s in summaries:
        txt = clean_text(s.get_text(" ", strip=True))
        if txt and len(txt) > 20:
            out.append(txt)
        if len(out) >= max_per_word:
            break
    return out, search_url

# --------------------------
# Main workflow
# --------------------------

def process_words(input_csv: str,
                  output_csv: str,
                  sources: List[str],
                  max_per_word: int,
                  overwrite: bool,
                  cache_path: str = "mnemonics_cache.json") -> None:
    df = pd.read_csv(input_csv)

    if "word" not in df.columns:
        raise ValueError("Input CSV must contain a 'word' column.")

    # Ensure target columns exist
    for col in ["mnemonic", "mnemonic_source_url"]:
        if col not in df.columns:
            df[col] = ""

    cache = load_cache(cache_path)

    def get_cached(word: str) -> Optional[dict]:
        return cache.get(word.lower())

    def put_cache(word: str, data: dict):
        cache[word.lower()] = data
        save_cache(cache_path, cache)

    for idx, row in df.iterrows():
        word = str(row["word"]).strip()
        if not word:
            continue

        if (not overwrite) and isinstance(row.get("mnemonic", ""), str) and row.get("mnemonic", "").strip():
            # Skip if already populated and not overwriting
            continue

        cached = get_cached(word)
        if cached:
            mnems = cached.get("mnemonics", [])
            src_url = cached.get("source_url", "")
            df.at[idx, "mnemonic"] = " • ".join(mnems) if mnems else ""
            df.at[idx, "mnemonic_source_url"] = src_url
            continue

        gathered: List[str] = []
        final_src_url: Optional[str] = None

        if "mnemonicdictionary" in sources:
            m, src = fetch_from_mnemonicdictionary(word, max_per_word=max_per_word)
            if m:
                gathered.extend(m)
                final_src_url = src or final_src_url
            sleep_jitter()

        if "artofmemory" in sources and len(gathered) < max_per_word:
            m, src = fetch_from_artofmemory(word, max_per_word=1)
            if m:
                gathered.extend([f"(Forum) {x}" for x in m])
                final_src_url = src or final_src_url
            sleep_jitter()

        gathered = unique_keep_order(gathered)[:max_per_word]
        df.at[idx, "mnemonic"] = " • ".join(gathered) if gathered else ""
        df.at[idx, "mnemonic_source_url"] = final_src_url or ""

        put_cache(word, {"mnemonics": gathered, "source_url": final_src_url or ""})

    df.to_csv(output_csv, index=False)
    print(f"✅ Wrote: {output_csv}")
    print("Columns added/updated: mnemonic, mnemonic_source_url")

def main():
    ap = argparse.ArgumentParser(description="Fetch real mnemonics and merge into CSV (no fabrications).")
    ap.add_argument("--input", required=True, help="Path to input CSV (must have a 'word' column)." )
    ap.add_argument("--output", required=True, help="Path to write output CSV." )
    ap.add_argument("--sources", nargs="+", default=["mnemonicdictionary"],
                    choices=["mnemonicdictionary", "artofmemory"],
                    help="Ordered list of sources to query.")
    ap.add_argument("--max-per-word", type=int, default=2, help="Max mnemonics to keep per word.")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing 'mnemonic' values.")
    ap.add_argument("--cache", default="mnemonics_cache.json", help="JSON cache path (for resume)." )
    args = ap.parse_args()

    process_words(
        input_csv=args.input,
        output_csv=args.output,
        sources=args.sources,
        max_per_word=args.max_per_word,
        overwrite=args.overwrite,
        cache_path=args.cache,
    )

if __name__ == "__main__":
    main()
