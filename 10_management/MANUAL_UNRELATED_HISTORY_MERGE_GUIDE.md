# Apollo AgriVerse: Safe Main-Branch Integration Guide

## Why this needs a manual merge

`main` and `chore/mindforge-workspace-migration` have unrelated Git histories. This means Git cannot perform a normal merge automatically. The migration branch contains the new MindForgeAI workspace organization; `main` contains existing Apollo work that must be preserved.

Do **not** force-push `main`. Do **not** delete either branch during the integration.

## Before starting

1. Agree on one person to perform the integration and one reviewer.
2. Ask teammates to pause direct pushes to `main` until the integration pull request is merged.
3. Clone the repository fresh, or make sure the working tree is clean:

   ```powershell
   git status
   git fetch origin
   ```

4. Confirm the two remote branches exist:

   ```powershell
   git branch -r
   ```

   You should see `origin/main` and `origin/chore/mindforge-workspace-migration`.

## Create a protected integration branch

Start from the current remote `main`, not from an old local `main`.

```powershell
git switch --detach origin/main
git switch -c integration/mindforge-workspace
git branch backup/pre-mindforge-main
```

The backup branch is local protection for the original `main` state. Do not remove it until the pull request is merged and verified.

## Start the merge without committing

```powershell
git merge origin/chore/mindforge-workspace-migration --allow-unrelated-histories --no-commit
```

Git will stop for conflicts. This is expected. Do not use `git merge --abort` unless the team decides to stop the integration entirely.

## Resolve conflicts using the MindForge destination map

Keep the new master-workspace folders at the repository root. Move or merge Apollo files into these canonical locations:

| Content | Destination |
| --- | --- |
| Project definition and API notes | `01_project_definition/Apollo_AgriVerse/` |
| Research sources, whitepaper and Command Center | `02_research_and_sources/Apollo_AgriVerse/` |
| Datasets and data documentation | `03_data_and_resources/Apollo_AgriVerse/` |
| Frontend, backend, ML, tests and scripts | `06_code/Apollo_AgriVerse/` |
| Formal reports | `08_project_report/Apollo_AgriVerse/` |
| Management records | `10_management/Apollo_AgriVerse/` |
| Deployment assets | `11_deployment/Apollo_AgriVerse/` |
| Presentation assets | `12_presentation_and_demo/Apollo_AgriVerse/` |

Rules while resolving:

- Never discard a file merely because it conflicts. Compare both versions first.
- If both versions contain useful work, keep the newer version in the canonical path and save the other for review under `05_shared_integration/Apollo_AgriVerse/merge_review/` with a clear suffix.
- Do not reintroduce a complete Apollo project under `04_active_workspaces/`; that folder is only for temporary individual experiments.
- Keep virtual environments, credentials, logs and temporary files untracked. Check `.gitignore` before staging.
- Resolve each file explicitly, then stage it with `git add <path>`.

Useful checks:

```powershell
git status
git diff --name-only --diff-filter=U
git diff
```

The merge is resolved only when `git diff --name-only --diff-filter=U` returns no files.

## Verify before committing

Run these checks from the repository root:

```powershell
git diff --check
python -m compileall -q 06_code\Apollo_AgriVerse 03_data_and_resources\Apollo_AgriVerse
git status
```

If a file is incorrectly named or is a duplicate, document the decision in the pull request rather than silently deleting it.

## Commit and request review

After all conflicts are resolved and checks pass:

```powershell
git add -A
git commit -m "chore: integrate MindForge workspace with existing Apollo history"
git push -u origin integration/mindforge-workspace
```

Open a pull request from `integration/mindforge-workspace` into `main`. The reviewer should check:

1. Existing `main` work is still present or deliberately relocated.
2. The MindForge directory structure is present at the root.
3. There are no secrets, virtual environments or generated cache files in the changes.
4. The Command Center and whitepaper remain available in `02_research_and_sources/Apollo_AgriVerse/Research_Docs/`.
5. The verification commands and any unresolved follow-up items are recorded in the pull request.

Only merge the pull request after that review. Do not force-push `main`.
