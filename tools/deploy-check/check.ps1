<#
  deploy-check/check.ps1  —  Vercel production-drift checker

  Compares each project's LIVE production deployment commit (from the Vercel API)
  against the local repo HEAD, and flags any project whose production is behind.

  Why this exists: big cross-project rollouts (syed-dynamic / design waves) push
  ~24 projects in one burst and can exhaust Vercel Hobby's ~100 production
  deploys/day cap. Auto-deploy projects silently retry on the next git push, but
  the MANUAL-deploy ones (callback, greenroom, mirrorscope, runway, letters) do
  not — a blocked `vercel deploy --prod` just stays blocked with no record in the
  dashboard. Run this after any large rollout to catch stragglers.

  Usage:   pwsh research-suite/tools/deploy-check/check.ps1
  Exit:    0 = everything current, 1 = at least one project is BEHIND / mismatched.

  Auth: reads the Vercel CLI token from the fresh auth.json (the xdg.data one;
  the com.vercel.cli/Data one is stale/403). No secrets are written anywhere.
#>

$ErrorActionPreference = 'Stop'
$TEAM = 'team_d2xc9qquXZTRk7dNNQZzDeKR'   # syahmedu's projects
$ROOT = 'C:\Users\Syed Asrar'

# --- Vercel project name  ->  local folder name (only where they differ) -----
# researchflow has 3 Vercel projects off one repo; we check the primary.
$MAP = [ordered]@{
  'bachelor-meal-plan' = 'bachelor-meal-plan'
  'bookscope'          = 'bookscope'
  'callback'           = 'callback'
  'campusdesk'         = 'campusdesk'
  'career-compass'     = 'career-compass'
  'faceprep-campus'    = 'faceprep-campus'
  'greenroom'          = 'greenroom'
  'ideabox'            = 'ideabox'
  'journaltime'        = 'journaltime'
  'papercards'         = 'paperpulse'      # folder != vercel name
  'researchflow'       = 'researchflow'
  'scalescope'         = 'scalebase'       # folder != vercel name
  'task-manager'       = 'task-manager'
  'theoryscope'        = 'theoryscope'
  'throughline-studio' = 'throughline-studio'
  'toolsscope'         = 'toolsscope'
  'tracewise'          = 'tracewise'
}

# Manual-deploy projects with NO git remote — can't compare by SHA; check by hand.
$MANUAL_NO_GIT = @('mirrorscope', 'runway', 'letters')

# --- token -------------------------------------------------------------------
$authFile = Join-Path $HOME 'AppData\Roaming\xdg.data\com.vercel.cli\auth.json'
if (-not (Test-Path $authFile)) { throw "Vercel auth.json not found at $authFile — run `vercel login`." }
$token   = (Get-Content $authFile -Raw | ConvertFrom-Json).token
$headers = @{ Authorization = "Bearer $token" }

# --- latest READY production deployment (+ commit sha) per project -----------
$uri = "https://api.vercel.com/v6/deployments?teamId=$TEAM&limit=100&target=production&state=READY"
$deployments = (Invoke-RestMethod -Uri $uri -Headers $headers).deployments
$live = @{}
foreach ($d in $deployments) {
  if (-not $live.ContainsKey($d.name)) {
    $live[$d.name] = [pscustomobject]@{
      sha  = $d.meta.githubCommitSha
      when = [DateTimeOffset]::FromUnixTimeMilliseconds($d.created).ToLocalTime().ToString('MM-dd HH:mm')
    }
  }
}

# --- compare -----------------------------------------------------------------
$rows  = @()
$drift = 0
foreach ($vname in $MAP.Keys) {
  $folder = $MAP[$vname]
  $path   = Join-Path $ROOT $folder
  $depSha = $live[$vname].sha
  $when   = $live[$vname].when

  if (-not (Test-Path (Join-Path $path '.git'))) {
    $rows += [pscustomobject]@{ Project=$vname; Status='? no .git locally'; Detail=$path }; continue
  }
  if (-not $depSha) {
    $rows += [pscustomobject]@{ Project=$vname; Status='? no live sha'; Detail="last prod $when" }; continue
  }

  Push-Location $path
  try {
    $head  = git rev-parse HEAD 2>$null
    # is the deployed sha an ancestor of HEAD? if not, histories diverged.
    git merge-base --is-ancestor $depSha HEAD 2>$null
    $isAncestor = ($LASTEXITCODE -eq 0)
    if ($head -eq $depSha) {
      $rows += [pscustomobject]@{ Project=$vname; Status='OK up-to-date'; Detail="prod $when" }
    } elseif ($isAncestor) {
      $ahead = git rev-list --count "$depSha..HEAD" 2>$null
      $subj  = git log -1 --format='%s' HEAD 2>$null
      $rows += [pscustomobject]@{ Project=$vname; Status="BEHIND by $ahead"; Detail="HEAD: $subj" }
      $drift++
    } else {
      $rows += [pscustomobject]@{ Project=$vname; Status='MISMATCH'; Detail="deployed $($depSha.Substring(0,7)) not in local history" }
      $drift++
    }
  } finally { Pop-Location }
}

# --- report ------------------------------------------------------------------
Write-Host ''
$rows | Format-Table -AutoSize @(
  @{ n='Project'; e={$_.Project} }
  @{ n='Status';  e={$_.Status}  }
  @{ n='Detail';  e={$_.Detail}  }
)

Write-Host 'Manual-deploy, no git remote (verify by hand — not checkable via SHA):' -ForegroundColor DarkGray
Write-Host ('  ' + ($MANUAL_NO_GIT -join ', ')) -ForegroundColor DarkGray
Write-Host ''

if ($drift -gt 0) {
  Write-Host "$drift project(s) BEHIND. To catch up a manual-deploy project:" -ForegroundColor Yellow
  Write-Host '  Set-Location "<repo>"; vercel deploy --prod' -ForegroundColor Yellow
  exit 1
} else {
  Write-Host 'All git-connected projects are current.' -ForegroundColor Green
  exit 0
}
