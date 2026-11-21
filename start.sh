#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "Open http://localhost:8000 in your browser"
python3 -m http.server 8000