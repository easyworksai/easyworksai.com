#!/usr/bin/env bash
# Refresh the footer "Last shipped" timestamp. Run before every production deploy.
cd "$(dirname "$0")/.." && sed -i '' -E "s/var deploy = new Date\('[^']+'\);/var deploy = new Date('$(date -u +%Y-%m-%dT%H:%M:%SZ)');/" index.html && echo "deploy stamp refreshed"
