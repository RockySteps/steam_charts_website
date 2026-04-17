#!/usr/bin/env python3
import os, shutil, tarfile, tempfile

APP_SRC = "/home/ubuntu/steam_charts_website"
BUNDLE = "/home/ubuntu/steampulse-v2.tar.gz"

stage = tempfile.mkdtemp()
try:
    os.makedirs(f"{stage}/dist/public", exist_ok=True)
    os.makedirs(f"{stage}/drizzle", exist_ok=True)
    os.makedirs(f"{stage}/patches", exist_ok=True)

    shutil.copy(f"{APP_SRC}/dist/index.js", f"{stage}/dist/")
    shutil.copytree(f"{APP_SRC}/dist/public", f"{stage}/dist/public", dirs_exist_ok=True)
    shutil.copytree(f"{APP_SRC}/drizzle", f"{stage}/drizzle", dirs_exist_ok=True)
    shutil.copytree(f"{APP_SRC}/patches", f"{stage}/patches", dirs_exist_ok=True)
    shutil.copy(f"{APP_SRC}/package.json", stage)
    shutil.copy(f"{APP_SRC}/pnpm-lock.yaml", stage)

    with tarfile.open(BUNDLE, "w:gz") as tar:
        tar.add(stage, arcname=".")

    size = os.path.getsize(BUNDLE)
    print(f"Bundle created: {BUNDLE} ({size/1024/1024:.1f} MB)")
finally:
    shutil.rmtree(stage)
