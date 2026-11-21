"""Populate a newly created workbench with the public, editable example."""

import errno
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from research_partner.resources import package_root, resource_path, source_root
from research_partner.storage.store import Problem


def initialize_starter_project(workspace):
    target = Path(workspace).expanduser().absolute()
    if target.is_symlink() or (target.exists() and any(target.iterdir())):
        return
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    source = source_root() / "examples/scientific-egg"
    if not (package_root().parent.name == "src" and source.is_dir()):
        source = resource_path("examples", "scientific-egg")

    # The publisher builds the reproducibility download beside its inputs.
    # Copy just the release manifest, so a read-only install works and local
    # extra files in a developer checkout never enter a user's project.
    with tempfile.TemporaryDirectory(dir=target.parent, prefix=".starter-") as tmp:
        staging = Path(tmp)
        try:
            members = resource_path("scientific-egg-files.txt").read_text().splitlines()
            for name in members:
                member = Path(name)
                if member.is_absolute() or ".." in member.parts:
                    raise ValueError(f"Invalid example member: {name}")
                original = source / member
                if original.resolve() != source.resolve() / member:
                    raise ValueError(f"Unexpected link in example: {name}")
                copy = staging / "example" / member
                copy.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(original, copy)
            prepared = staging / "workspace"
            result = subprocess.run(
                [
                    sys.executable,
                    "-B",
                    str(staging / "example/scripts/05_publish_demo.py"),
                    "--initial-workspace",
                    str(prepared),
                ],
                env={**os.environ, "PYTHONPATH": str(package_root().parent)},
                capture_output=True,
                text=True,
            )
            if result.returncode:
                raise ValueError(result.stderr.strip() or "Example publisher failed")
        except (OSError, ValueError) as error:
            raise Problem(
                f"无法建立科学煮蛋示例项目：{error}", "starter_project_failed", 500
            ) from error

        # On POSIX rename publishes the complete workspace atomically. A racing
        # launcher or another writer that populated the target keeps its data.
        try:
            prepared.rename(target)
        except OSError as error:
            if error.errno not in {errno.EEXIST, errno.ENOTEMPTY}:
                raise
