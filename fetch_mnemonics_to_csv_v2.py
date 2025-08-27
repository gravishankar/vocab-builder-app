#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_mnemonics_to_csv_v2.py  —  Debug-friendly

Changes vs v1:
- --verbose logging (HTTP status, parsing decisions, per-word summary)
- --limit N to process only first N words (for quick tests)
- --flush-every N to write partial CSVs during the run (e.g., every 20 rows)
- --test WORD to fetch just one word and print the mnemonics, then exit
- --no-cache to ignore cache; --cache path still used for writes if not disabled
- Better parsing heuristics for MnemonicDictionary
- Writes output early (even if errors occur later)
"""

import argparse
import json
import os
import random
import re
import sys
import time
from typing import List, Dict, Optional, Tuple
from urllib.parse import quote

import pandas as pd
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 "
                  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15"
}

def vprint(verbose: bool, *args, **kwargs):
    if verbose:
        print(*args, **kwargs, file=sys.stderr)

def sleep_jitter(base: float = 1.3, jitter: float = 0.7):
    delay = base + random.random() * jitter
    time.sleep(delay)

def load_cache(path: str, verbose: bool=False) -> Dict[str, dict]:
    if not path or not os.path.exists(path):
        vprint(verbose, f"[cache] no cache at {path!r}")
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            vprint(verbose, f"[cache] loaded {len(data)} entries from {path}")
            return data
    except Exception as e:
        vprint(verbose, f"[cache] failed to load {path}: {e}")
        return {}

def save_cache(path: str, data: Dict[str, dict], verbose: bool=False):
    if not path:
        return
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
    vprint(verbose, f"[cache] wrote {len(data)} entries to {path}")

def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def unique_keep_order(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out

def fetch_from_mnemonicdictionary(word: str, max_per_word: int = 3, verbose: bool=False) -> Tuple[List[str], Optional[str], int]:
    """
    Returns up to max_per_word mnemonics and the page URL; also returns HTTP status code for diagnostics.
    """
    url = f"https://mnemonicdictionary.com/word/{quote(word)}"
    status = -1
    try:
        resp = requests.get(url, headers=HEADERS, timeout=25)
        status = resp.status_code
    except requests.RequestException as e:
        vprint(verbose, f"[mdict] request error for {word!r}: {e}")
        return [], None, status

    vprint(verbose, f"[mdict] GET {url} -> {status}")
    if status != 200:
        return [], url, status

    text = resp.text or ""
    if "MnemonicDictionary" not in text:
        vprint(verbose, f"[mdict] unexpected content for {word!r} (missing site marker)")
        return [], url, status

    soup = BeautifulSoup(text, "html.parser")

    # Heuristic 1: look for heading containing "Mnemonics (Memory Aids)"
    header_elt = None
    for tag in soup.find_all(string=re.compile(r"Mnemonics\s*\(Memory Aids\)", re.I)):
        header_elt = tag.parent
        break

    # Heuristic 2: try a common container by id/class if header not found
    if not header_elt:
        header_elt = soup.find(lambda t: t.name in ("h2", "h3") and "mnemonic" in t.get_text(" ", strip=True).lower())

    mnems: List[str] = []

    if header_elt:
        # Collect subsequent blocks until next section header
        for sib in header_elt.next_siblings:
            if getattr(sib, "name", None) in {"h1", "h2", "h3", "h4", "h5", "h6"}:
                break
            if hasattr(sib, "get_text"):
                block = clean_text(sib.get_text(" ", strip=True))
            else:
                block = clean_text(str(sib))
            if not block:
                continue
            if "Download our Mobile App" in block or "Books We Recommend" in block:
                continue
            if block.lower().startswith(("definition", "synonyms")):
                continue
            # Split into plausible lines
            candidates = re.split(r"(?<=\.)\s+|  {2,}", block)
            for c in candidates:
                c = clean_text(c)
                if not c or c.lower().startswith(("example sentence", "mnemonics (memory aids)")):
                    continue
                c = re.sub(r"\s*\d+\s+\d+\s*$", "", c).strip()
                if 6 <= len(c) <= 280:
                    mnems.append(c)

    # Heuristic 3: fallback — look for list items near "mnemonics"
    if not mnems:
        for sec in soup.find_all(["ul", "ol", "div"]):
            sec_txt = sec.get_text(" ", strip=True).lower()
            if "mnemonic" in sec_txt and len(sec_txt) > 40:
                for li in sec.find_all(["li", "p"]):
                    c = clean_text(li.get_text(" ", strip=True))
                    if 6 <= len(c) <= 280:
                        mnems.append(c)
                if mnems:
                    break

    mnems = unique_keep_order(mnems)[:max_per_word]
    vprint(verbose, f"[mdict] {word!r}: found {len(mnems)} mnemonics")
    return mnems, url, status

def process_words(input_csv: str,
                  output_csv: str,
                  max_per_word: int,
                  overwrite: bool,
                  cache_path: Optional[str],
                  verbose: bool,
                  limit: Optional[int],
                  flush_every: int) -> None:
    df = pd.read_csv(input_csv)
    if "word" not in df.columns:
        raise ValueError("Input CSV must contain a 'word' column.")

    for col in ["mnemonic", "mnemonic_source_url"]:
        if col not in df.columns:
            df[col] = ""

    cache: Dict[str, dict] = {} if cache_path is None else load_cache(cache_path, verbose=verbose)

    processed = 0
    for idx, row in df.iterrows():
        if limit is not None and processed >= limit:
            break

        word = str(row["word"]).strip()
        if not word:
            continue

        if (not overwrite) and isinstance(row.get("mnemonic", ""), str) and row.get("mnemonic", "").strip():
            vprint(verbose, f"[skip] already has mnemonic for {word!r}")
            processed += 1
            continue

        cached = {} if cache_path is None else cache.get(word.lower(), {})
        if cached:
            mnems = cached.get("mnemonics", [])
            src_url = cached.get("source_url", "")
            df.at[idx, "mnemonic"] = " • ".join(mnems) if mnems else ""
            df.at[idx, "mnemonic_source_url"] = src_url
            vprint(verbose, f"[cache-hit] {word!r}: {len(mnems)} items")
            processed += 1
            if flush_every and processed % flush_every == 0:
                df.to_csv(output_csv, index=False)
                vprint(verbose, f"[flush] wrote partial output to {output_csv}")
            continue

        mnems, url, status = fetch_from_mnemonicdictionary(word, max_per_word=max_per_word, verbose=verbose)
        df.at[idx, "mnemonic"] = " • ".join(mnems) if mnems else ""
        df.at[idx, "mnemonic_source_url"] = url or ""

        if cache_path is not None:
            cache[word.lower()] = {"mnemonics": mnems, "source_url": url or ""}
            save_cache(cache_path, cache, verbose=verbose)

        vprint(verbose, f"[done] {word!r}: HTTP {status}, saved {len(mnems)} mnemonics")

        processed += 1
        if flush_every and processed % flush_every == 0:
            df.to_csv(output_csv, index=False)
            vprint(verbose, f"[flush] wrote partial output to {output_csv}")

        sleep_jitter()

    # final write
    df.to_csv(output_csv, index=False)
    vprint(verbose, f"[final] wrote {output_csv}")

def main():
    ap = argparse.ArgumentParser(description="Fetch real mnemonics into CSV with debug options.")
    ap.add_argument("--input", required=True, help="Path to input CSV (must have 'word').")
    ap.add_argument("--output", required=True, help="Path to write output CSV.")
    ap.add_argument("--max-per-word", type=int, default=2, help="Max mnemonics to keep per word.")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing 'mnemonic' values.")
    ap.add_argument("--cache", default="mnemonics_cache.json", help="JSON cache path (omit with --no-cache).")
    ap.add_argument("--no-cache", action="store_true", help="Ignore cache on read and do not write cache.")
    ap.add_argument("--verbose", action="store_true", help="Print debug logs to stderr.")
    ap.add_argument("--limit", type=int, default=None, help="Process at most N words (for quick tests).")
    ap.add_argument("--flush-every", type=int, default=20, help="Write partial CSV every N processed rows (0=off).")
    ap.add_argument("--test", default=None, help="Fetch a single WORD and print mnemonics, then exit.")
    args = ap.parse_args()

    if args.test:
        m, url, status = fetch_from_mnemonicdictionary(args.test, max_per_word=args.max_per_word, verbose=True)
        print(f"WORD: {args.test}")
        print(f"URL : {url}")
        print(f"HTTP: {status}")
        print("MNEMONICS:")
        for i, x in enumerate(m, 1):
            print(f"{i}. {x}")
        sys.exit(0)

    cache_path = None if args.no_cache else args.cache

    process_words(
        input_csv=args.input,
        output_csv=args.output,
        max_per_word=args.max_per_word,
        overwrite=args.overwrite,
        cache_path=cache_path,
        verbose=args.verbose,
        limit=args.limit,
        flush_every=args.flush_every,
    )

if __name__ == "__main__":
    main()
