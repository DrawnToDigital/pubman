## setup.sh
# This script sets up a Python virtual environment and installs the required packages.

dir=$(dirname "$0")
cd "$dir" || exit

if [ ! -f requirements.dev.txt ]; then
    echo "requirements.dev.txt not found"
    exit 1
fi

if [ ! -d .env/ ]; then
    echo "Creating virtual environment .env/ ..."
    python3 -m venv .env
fi

echo "Updating pip..."
./.env/bin/pip install --upgrade pip

echo "Updating requirements..."
./.env/bin/pip install -r requirements.dev.txt

echo "\nNow run: source .env/bin/activate"