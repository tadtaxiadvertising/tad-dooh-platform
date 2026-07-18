#!/bin/bash
# TAD Remotion Engine - startup script for Hermes background
export PATH="$PATH:/c/Program Files/nodejs"
cd "$(dirname "$0")"
node dist/index.js