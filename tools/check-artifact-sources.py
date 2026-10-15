#!/usr/bin/env python3
"""Verify APK build inputs against the working tree and the declared Git commit.

Validation permits later commits that only change documentation or release files.
Writing buildInputs requires sourceCommit to be HEAD and every input to be committed.
This verifies source provenance; APK/part checksums are checked by assemble-apk.py.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile

DEFAULT_ROOT = Path(__file__).resolve().parents[1]
COMMIT_RE = re.compile(r"[0-9a-fA-F]{40}\Z")
SHA_RE = re.compile(r"[0-9a-f]{64}\Z")
EXCLUDED_DIRS = {"build", ".gradle", ".git", "node_modules", "__pycache__"}


class ProvenanceError(Exception):
    """A manifest or source input failed validation."""


def git(repo, *args, check=True):
    result = subprocess.run(
        ["git", "--no-replace-objects", "-C", str(repo), *args], capture_output=True, timeout=60
    )
    if check and result.returncode:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise ProvenanceError("Git operation failed: " + (detail or args[0]))
    return result


def safe_path(raw):
    if not isinstance(raw, str) or not raw or "\\" in raw:
        raise ProvenanceError("Invalid build input path")
    path = PurePosixPath(raw)
    if (path.is_absolute() or path.as_posix() != raw
            or any(part in {"", ".", ".."} for part in raw.split("/"))
            or re.search(r"[\x00-\x1f\x7f]", raw)):
        raise ProvenanceError("Unsafe build input path: " + repr(raw))
    return path


def is_input(raw):
    path = safe_path(raw)
    if path.parts[0] not in {"web", "android"} or len(path.parts) < 2:
        return False
    if any(part in EXCLUDED_DIRS for part in path.parts[:-1]):
        return False
    if raw == "android/README.md" or path.name == "local.properties":
        return False
    if path.name.lower().endswith((".jks", ".keystore")):
        return False
    return True


def working_inputs(repo):
    # Include tracked inputs and new, nonignored inputs. A new art/source file
    # must not disappear from the manifest merely because it is not committed.
    data = git(repo, "ls-files", "--cached", "--others", "--exclude-standard", "-z",
               "--", "web", "android").stdout
    return sorted({p.decode("utf-8") for p in data.split(b"\0") if p
                   and is_input(p.decode("utf-8"))})


def committed_inputs(repo, commit):
    data = git(repo, "ls-tree", "-r", "-z", "--full-tree", commit,
               "--", "web", "android").stdout
    inputs = []
    for record in data.split(b"\0"):
        if not record:
            continue
        meta, encoded_path = record.split(b"\t", 1)
        path = encoded_path.decode("utf-8")
        if not is_input(path):
            continue
        mode, kind, _object = meta.split(b" ")
        if kind != b"blob" or mode not in {b"100644", b"100755"}:
            raise ProvenanceError("Build input is not a regular Git file: " + path)
        inputs.append(path)
    return sorted(inputs)


def ensure_source_commit(repo, commit, fetch):
    if not isinstance(commit, str) or not COMMIT_RE.fullmatch(commit):
        raise ProvenanceError("sourceCommit must be a safe 40-character Git commit SHA")
    commit = commit.lower()
    result = git(repo, "cat-file", "-t", commit, check=False)
    if result.returncode and fetch:
        # The revision cannot inject an option, refspec, path or shell command.
        git(repo, "fetch", "--no-tags", "--depth=1", "origin", commit)
        result = git(repo, "cat-file", "-t", commit, check=False)
    if result.returncode:
        raise ProvenanceError("sourceCommit is unavailable locally; use --fetch-source for a shallow clone")
    if result.stdout.strip() != b"commit":
        raise ProvenanceError("sourceCommit does not identify a Git commit object")
    return commit


def digest_stream(stream):
    digest = hashlib.sha256()
    size = 0
    for block in iter(lambda: stream.read(1024 * 1024), b""):
        size += len(block)
        digest.update(block)
    return size, digest.hexdigest()


def file_digest(repo, path):
    target = repo / path
    if target.is_symlink() or not target.is_file():
        raise ProvenanceError("Missing or nonregular current build input: " + path)
    # Reject symlink ancestors too: hashing outside the repository would not
    # verify the bytes of the declared Git source input.
    if any(parent.is_symlink() for parent in target.parents if parent != repo.parent):
        raise ProvenanceError("Symlink in current build input path: " + path)
    with target.open("rb") as stream:
        return digest_stream(stream)


def committed_digest(repo, commit, path):
    command = ["git", "--no-replace-objects", "-C", str(repo), "show", commit + ":" + path]
    with subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        result = digest_stream(process.stdout)
        detail = process.stderr.read().decode("utf-8", errors="replace").strip()
        if process.wait(timeout=60):
            raise ProvenanceError("Cannot read sourceCommit input " + path + ": " + detail)
    return result


def require_same_set(expected, actual, description):
    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    if missing or extra:
        details = []
        if missing:
            details.append("missing=" + ", ".join(missing))
        if extra:
            details.append("extra=" + ", ".join(extra))
        raise ProvenanceError(description + " input path set differs: " + "; ".join(details))


def manifest_inputs(manifest):
    rows = manifest.get("buildInputs")
    if not isinstance(rows, list) or not rows:
        raise ProvenanceError("Manifest must contain a nonempty buildInputs array; use --write-inputs after committing frozen sources")
    result = {}
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"path", "size", "sha256"}:
            raise ProvenanceError("Each buildInputs entry must contain exactly path, size and sha256")
        path = row["path"]
        if not is_input(path):
            raise ProvenanceError("Manifest contains an excluded or nonbuild input: " + str(path))
        if path in result:
            raise ProvenanceError("Duplicate build input: " + path)
        if type(row["size"]) is not int or row["size"] < 0:
            raise ProvenanceError("Invalid build input size: " + path)
        if not isinstance(row["sha256"], str) or not SHA_RE.fullmatch(row["sha256"]):
            raise ProvenanceError("Invalid build input SHA-256: " + path)
        result[path] = (row["size"], row["sha256"])
    return result


def verify(repo, manifest, commit):
    rows = manifest_inputs(manifest)
    current = working_inputs(repo)
    original = committed_inputs(repo, commit)
    require_same_set(current, rows, "Manifest/current")
    require_same_set(original, rows, "Manifest/sourceCommit")
    for path in sorted(rows):
        if file_digest(repo, path) != rows[path]:
            raise ProvenanceError("Current build input size/SHA-256 mismatch: " + path)
        if committed_digest(repo, commit, path) != rows[path]:
            raise ProvenanceError("sourceCommit build input size/SHA-256 mismatch: " + path)
    return len(rows)


def write_inputs(repo, manifest, commit, target):
    head = git(repo, "rev-parse", "HEAD").stdout.decode("ascii").strip()
    if head != commit:
        raise ProvenanceError("--write-inputs requires sourceCommit to equal HEAD; validation permits later documentation commits")
    current = working_inputs(repo)
    require_same_set(committed_inputs(repo, commit), current, "Current/sourceCommit")
    if not current:
        raise ProvenanceError("No web/Android build inputs found")
    rows = []
    for path in current:
        size, digest = file_digest(repo, path)
        if committed_digest(repo, commit, path) != (size, digest):
            raise ProvenanceError("Cannot write inputs from uncommitted source bytes: " + path)
        rows.append({"path": path, "size": size, "sha256": digest})
    manifest["buildInputs"] = rows
    # Validate the complete draft before replacing the caller's manifest.
    verify(repo, manifest, commit)
    fd, temporary = tempfile.mkstemp(prefix=target.name + ".", suffix=".tmp", dir=target.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            json.dump(manifest, output, ensure_ascii=False, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=DEFAULT_ROOT,
                        help="Git repository root (default: this script's repository)")
    parser.add_argument("--manifest", type=Path, default=Path("releases/parts-v4/manifest.json"),
                        help="Manifest path, relative to --repo unless absolute")
    parser.add_argument("--fetch-source", action="store_true",
                        help="Fetch a missing safe sourceCommit from origin with depth=1")
    parser.add_argument("--write-inputs", action="store_true",
                        help="Populate/update buildInputs only from committed, frozen sourceCommit=HEAD")
    args = parser.parse_args()
    try:
        repo = args.repo.resolve()
        actual = Path(git(repo, "rev-parse", "--show-toplevel").stdout.decode("utf-8").strip()).resolve()
        if repo != actual:
            raise ProvenanceError("--repo must be the Git repository root")
        target = args.manifest if args.manifest.is_absolute() else repo / args.manifest
        manifest = json.loads(target.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            raise ProvenanceError("Manifest must be a JSON object")
        commit = ensure_source_commit(repo, manifest.get("sourceCommit"), args.fetch_source)
        count = write_inputs(repo, manifest, commit, target) if args.write_inputs else verify(repo, manifest, commit)
        operation = "Wrote and verified" if args.write_inputs else "Verified"
        print(f"{operation} {count} exact build inputs against current files and sourceCommit {commit}")
        return 0
    except (ProvenanceError, OSError, UnicodeError, json.JSONDecodeError, subprocess.SubprocessError) as error:
        print("Artifact source validation failed: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
