#!/bin/bash
dir=$(dirname "$0")
cd "$dir" || exit
if [ ! -f requirements.in ]; then
    echo "requirements.in file not found"
    exit 1
fi

pip-compile --strip-extras requirements.in --output-file=- > requirements.txt