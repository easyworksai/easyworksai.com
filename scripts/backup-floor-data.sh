#!/bin/bash
# Backs up every blob in The Floor's sales-team store to a dated local folder.
# Run manually or on a schedule. Requires netlify CLI logged in.
set -e
export NETLIFY_SITE_ID=3ba07fa5-82d5-4f17-8f6f-cdc9a91d4191
DEST="$HOME/Desktop/Easyworks AI Solutions/Internal/Floor-Backups/$(date +%Y-%m-%d)"
mkdir -p "$DEST"
cd "$(dirname "$0")/.."
KEYS=$(netlify blobs:list sales-team 2>/dev/null | grep -oE '[a-zA-Z0-9._-]+\.json' | sort -u)
for K in $KEYS; do
  netlify blobs:get sales-team "$K" -O "$DEST/$K" 2>/dev/null && echo "backed up $K"
done
# keep the 14 most recent backups
cd "$DEST/.." && ls -1d 20* 2>/dev/null | sort -r | tail -n +15 | xargs rm -rf 2>/dev/null || true
echo "BACKUP OK -> $DEST"
