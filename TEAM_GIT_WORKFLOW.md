# Apollo AgriVerse Team Git Workflow

## Canonical repository

All team work belongs in **one** repository:

`https://github.com/Vijayalaxmi-ks/Apollo_AgriVerse.git`

Do not change `origin` to a personal or empty repository. Verify it before work:

```powershell
git remote -v
```

Both fetch and push URLs must be the canonical repository above.

## Branch model

- `main` — stable, reviewed project state. No direct pushes.
- `develop` — reviewed integration branch for the team.
- `member/<your-id>/<task>` — one branch per person and task.
- `chore/*` — documentation, housekeeping and tooling.

Branches isolate people’s work. Personal folders are for notes or experiments only; they are not a replacement for branches.

## Start work

Clone once, then create a personal task branch using the supplied script:

```powershell
git clone https://github.com/Vijayalaxmi-ks/Apollo_AgriVerse.git
cd Apollo_AgriVerse
.\scripts\start-member-work.ps1 YOUR_ID short-task-name
```

Examples of valid IDs: `DAKSHINI`, `DIKSHA`, `NAINA`, `NANDU`, `VISH`.

The script creates a branch such as `member/dakshini/weather-dashboard` from the latest `origin/develop` and creates `11_Team/DAKSHINI/` for personal notes.

## Daily routine

Before editing:

```powershell
git fetch origin
git rebase origin/develop
```

After a small, focused change:

```powershell
git status
git add <files-you-changed>
git commit -m "feat: describe the change"
git push -u origin HEAD
```

Never use `git add .` or `git add -A` until you have checked `git status`. Never force-push `main` or `develop`.

## Share and receive changes

1. Push your `member/<id>/<task>` branch.
2. Open a pull request into `develop`.
3. Another teammate reviews it and merges it only after checks pass.
4. When a checkpoint is stable, merge `develop` into `main` through a pull request.

To inspect another person’s work without changing your own branch:

```powershell
git fetch origin
git log --oneline origin/member/THEIR_ID/THEIR_TASK
git diff HEAD..origin/member/THEIR_ID/THEIR_TASK
```

To receive approved team changes, rebase your branch on `origin/develop`; do not merge random member branches directly into yours.

## Large data and images

The repository currently contains a large raw image dataset, which makes clone and pull slower. Do not add more raw datasets, model binaries, ZIP files, or generated outputs to normal Git history.

- Keep small samples, code, metadata and documentation in Git.
- Store large raw data in approved external storage or Git LFS after team agreement.
- Add an access link and checksum in documentation instead of committing a second copy.

## If Git says you are behind or rejected

Do not force-push. Run:

```powershell
git status
git fetch origin
git rebase origin/develop
```

Resolve conflicts only in your own member branch, test, then continue:

```powershell
git add <resolved-files>
git rebase --continue
```

If the conflict involves shared architecture or datasets, stop and ask the team before choosing a version.
