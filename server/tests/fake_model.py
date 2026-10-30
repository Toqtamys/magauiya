"""Тестовая «модель»: считает байты входного файла и пишет JSON."""
import argparse
import json
import os
import sys

ap = argparse.ArgumentParser()
ap.add_argument("--input")
ap.add_argument("--output")
ap.add_argument("--fail", default="0")
a = ap.parse_args()
print("PROGRESS 0.5 half", flush=True)
if a.fail == "1":
    print("weights are broken", file=sys.stderr)
    sys.exit(3)
with open(a.output, "w") as f:
    json.dump({"summary": {"bytes": os.path.getsize(a.input)}}, f)
