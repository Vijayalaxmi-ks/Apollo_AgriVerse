param(
    [Parameter(Mandatory = $true)][string]$MemberId,
    [Parameter(Mandatory = $true)][string]$TaskName
)

$safeMember = $MemberId.Trim().ToLower() -replace '[^a-z0-9-]', ''
$safeTask = $TaskName.Trim().ToLower() -replace '[^a-z0-9-]', '-'

if (-not $safeMember -or -not $safeTask) {
    throw 'Provide a member ID and a short task name using letters, numbers or hyphens.'
}

if ((git status --porcelain)) {
    throw 'Commit, stash or discard local changes before starting a new task branch.'
}

git fetch origin
git switch -c "member/$safeMember/$safeTask" origin/develop

$notesPath = Join-Path '11_Team' $safeMember.ToUpper()
New-Item -ItemType Directory -Force -Path $notesPath | Out-Null

if (-not (Test-Path (Join-Path $notesPath 'README.md'))) {
    @"
# $($safeMember.ToUpper()) Workspace Notes

Use this folder for personal notes and small experimental evidence related to your branch. Keep shared source code in the project folders and submit it through a pull request to `develop`.
"@ | Set-Content -NoNewline -Encoding utf8 (Join-Path $notesPath 'README.md')
}

Write-Host "Ready: member/$safeMember/$safeTask"
