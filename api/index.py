import sys
import os
from pathlib import Path

# Add project root and backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import shutil

# If on Vercel serverless environment, setup writable sqlite copy in /tmp
if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    tmp_db = Path("/tmp/mediassist.db")
    src_db = backend_dir / "mediassist.db"
    if not tmp_db.exists() and src_db.exists():
        try:
            shutil.copy2(src_db, tmp_db)
        except Exception as e:
            print(f"Notice: failed to copy sqlite database to /tmp: {e}")
    if tmp_db.exists():
        os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db}"
    else:
        os.environ.setdefault("DATABASE_URL", f"sqlite:///{backend_dir / 'mediassist.db'}")
else:
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{backend_dir / 'mediassist.db'}")

from backend.app.main import app
