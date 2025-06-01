#!/bin/bash

echo "=========================================="
echo "Memulai Smart Project Planner ML Service..."
echo "=========================================="

# Cek apakah layanan sudah berjalan
if pgrep -f "uvicorn app:app" > /dev/null; then
    echo "✓ ML service sudah berjalan. Gunakan 'lsof -i :8000' untuk melihat detailnya."
    exit 0
fi

# Cek apakah Python terinstall
if ! command -v python3 &> /dev/null; then
    echo "✗ Python tidak ditemukan. Silakan install Python 3.8 atau lebih baru."
    exit 1
fi

# Cek apakah pip terinstall
if ! command -v pip3 &> /dev/null; then
    echo "✗ pip tidak ditemukan. Silakan install pip untuk Python 3."
    exit 1
fi

# Cek apakah virtual environment sudah ada, jika tidak buat baru
if [ ! -d "venv" ]; then
    echo "Membuat virtual environment..."
    python3 -m venv venv
fi

# Aktifkan virtual environment
echo "Mengaktifkan virtual environment..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    echo "✗ Virtual environment tidak dapat diaktifkan."
    exit 1
fi

# Update pip
echo "Memperbarui pip..."
python -m pip install --upgrade pip

# Install dependencies
echo "Menginstall dependencies..."
pip install -r requirements.txt

# Memeriksa apakah argument --bg diberikan (untuk background)
if [ "$1" == "--bg" ]; then
    echo "Menjalankan server FastAPI dalam background..."
    nohup python -m uvicorn app:app --host 0.0.0.0 --port 8000 > ml_service.log 2>&1 &
    echo "✓ ML service berjalan di background dengan PID: $!"
    echo "Gunakan 'tail -f ml_service.log' untuk melihat log"
else
    # Jalankan server di foreground
    echo "Menjalankan server FastAPI..."
    echo "Tekan Ctrl+C untuk menghentikan server"
    python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
fi 