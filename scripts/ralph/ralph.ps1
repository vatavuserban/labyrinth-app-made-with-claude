param(
  [int]$MaxIterations = 10,
  [string]$ClaudeArgs = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot    = Resolve-Path (Join-Path $ScriptDir "..\..") | Select-Object -ExpandProperty Path

$PrdPath     = Join-Path $ScriptDir "prd.json"
$ProgressPath= Join-Path $ScriptDir "progress.txt"
$PromptPath  = Join-Path $ScriptDir "prompt.md"
$LogPath     = Join-Path $ScriptDir "ralph.log"

if (!(Test-Path $PrdPath))      { throw "Missing: $PrdPath" }
if (!(Test-Path $ProgressPath)) { throw "Missing: $ProgressPath" }
if (!(Test-Path $PromptPath))   { throw "Missing: $PromptPath" }

Set-Location $RepoRoot

function Read-Prd {
  return (Get-Content $PrdPath -Raw | ConvertFrom-Json)
}

function All-Passed($prd) {
  foreach ($s in $prd.userStories) {
    if ($s.passes -ne $true) { return $false }
  }
  return $true
}

function Ensure-GitRepo {
  git rev-parse --is-inside-work-tree *> $null
}

function Ensure-Branch($prd) {
  $branch = $prd.branchName
  if ([string]::IsNullOrWhiteSpace($branch)) { throw "prd.json missing branchName" }

  $current = (git branch --show-current).Trim()
  if ($current -ne $branch) {
    # Create if missing, otherwise checkout
    $exists = (git branch --list $branch).Count -gt 0
    if (-not $exists) {
      git checkout -b $branch | Out-Null
    } else {
      git checkout $branch | Out-Null
    }
  }
}

function Commit-If-Changes($iter) {
  $status = git status --porcelain
  if ($status) {
    git add -A | Out-Null
    git commit -m "ralph: iteration $iter" | Out-Null
  }
}

Ensure-GitRepo

$prd0 = Read-Prd
Ensure-Branch $prd0

"=== Ralph PS Loop start: $(Get-Date -Format o) ===" | Tee-Object -FilePath $LogPath -Append | Out-Null
"RepoRoot: $RepoRoot" | Tee-Object -FilePath $LogPath -Append | Out-Null
"PRD: $PrdPath" | Tee-Object -FilePath $LogPath -Append | Out-Null
"Prompt: $PromptPath" | Tee-Object -FilePath $LogPath -Append | Out-Null
"MaxIterations: $MaxIterations" | Tee-Object -FilePath $LogPath -Append | Out-Null

for ($i=1; $i -le $MaxIterations; $i++) {
  $prd = Read-Prd
  if (All-Passed $prd) {
    "All user stories are passes=true. Stopping." | Tee-Object -FilePath $LogPath -Append | Out-Null
    break
  }

  "---- Iteration $i / $MaxIterations @ $(Get-Date -Format o) ----" | Tee-Object -FilePath $LogPath -Append | Out-Null

  # Feed the prompt file into Claude Code (fresh process each iteration)
  # Note: -p is used by claude-ralph to run Claude Code non-interactively.
  $promptText = Get-Content $PromptPath -Raw

  $cmd = "claude -p " + ('"' + $promptText.Replace('"','\"') + '"')
  if ($ClaudeArgs -and $ClaudeArgs.Trim().Length -gt 0) {
    $cmd = "claude $ClaudeArgs -p " + ('"' + $promptText.Replace('"','\"') + '"')
  }

  "Running: $cmd" | Tee-Object -FilePath $LogPath -Append | Out-Null

  # Run and append output to log
  cmd /c $cmd 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null

  Commit-If-Changes $i
}

"=== Ralph PS Loop end: $(Get-Date -Format o) ===" | Tee-Object -FilePath $LogPath -Append | Out-Null
# SIG # Begin signature block
# MIIRzAYJKoZIhvcNAQcCoIIRvTCCEbkCAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQU08nwPavf7W9RAmYkZkeuz3/Z
# 5luggg4fMIIGCzCCA/OgAwIBAgITegAAAANNjd0+foZxJAAAAAAAAzANBgkqhkiG
# 9w0BAQsFADAkMQ0wCwYDVQQKEwRpc3RhMRMwEQYDVQQDEwppc3RhUm9vdENBMB4X
# DTE2MTExNDEwMDQxOVoXDTM2MTEwMjA4NDMyNFowXzETMBEGCgmSJomT8ixkARkW
# A2NvbTEUMBIGCgmSJomT8ixkARkWBGlzdGExEjAQBgoJkiaJk/IsZAEZFgJkczEN
# MAsGA1UEChMEaXN0YTEPMA0GA1UEAxMGaXN0YUNBMIIBIjANBgkqhkiG9w0BAQEF
# AAOCAQ8AMIIBCgKCAQEAnrAWAFDGx0ZcH7VaTrym1cOUhNp1gp86rrMxEGtLZlwg
# A6agrG+74W+c8D03CmjQy1hcQcwvU4WH/D3QIIBWuozJnisU0UU8dS+pgcZ41A0d
# /U8Ma2k5hcynnWO9vJb4nXEaZNHf1c74AhrdZVC3IkVQhUTuCzYtY61mDLLztUiy
# dJunM2z9kUq9v4zyVme1CX6LE5qFWHqY9BzuH/qoN2VU6J/hJHhonjtACdHqbacX
# wTWARh7BR4ZnjE92SXuqd3DWRP9qIgAyCeS/xG2xy3oqytLmEkcdKIi1bGg2x+iu
# dpjPXHIarezXDdQeNETvJ0abZp9Z2e0T1/q4rZ9VIQIDAQABo4IB+TCCAfUwEAYJ
# KwYBBAGCNxUBBAMCAQEwIwYJKwYBBAGCNxUCBBYEFBfmEu1MZxBMqh5S/ObHqHok
# Y/8GMB0GA1UdDgQWBBTk1tgF+sBpXR4D4qcgY3pEq8wGTzARBgNVHSAECjAIMAYG
# BFUdIAAwGQYJKwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwCwYDVR0PBAQDAgGGMA8G
# A1UdEwEB/wQFMAMBAf8wHwYDVR0jBBgwFoAUokCe6IZD/SsnrdNycgc3uYaJsVMw
# cgYDVR0fBGswaTBnoGWgY4YwaHR0cDovL3BraS5kcy5pc3RhLmNvbS9DZXJ0RW5y
# b2xsL2lzdGFSb290Q0EuY3Jshi9odHRwOi8vY2EuZHMuaXN0YS5jb20vQ2VydEVu
# cm9sbC9pc3RhUm9vdENBLmNybDCBuwYIKwYBBQUHAQEEga4wgaswUwYIKwYBBQUH
# MAKGR2h0dHA6Ly9jYS5kcy5pc3RhLmNvbS9DZXJ0RW5yb2xsL1BMS0FUM0NBMDAx
# LmRzLmlzdGEuY29tX2lzdGFSb290Q0EuY3J0MFQGCCsGAQUFBzAChkhodHRwOi8v
# cGtpLmRzLmlzdGEuY29tL0NlcnRFbnJvbGwvUExLQVQzQ0EwMDEuZHMuaXN0YS5j
# b21faXN0YVJvb3RDQS5jcnQwDQYJKoZIhvcNAQELBQADggIBABHQElNFnzJTTouO
# nYqUgSZ9vN6AMqxRi/oW6H4zZ3mBJw8OOWN34/LQCpoNQZF7iiBdsvsXLPoR6K9i
# orkuoSu2LNcMTX8uSzMGhLJ3sc2/gGQD3xDvX2p7lI3qjEHNG4HIf80GLduKyuPu
# L63TxzidEJ9H0kd78OYjYRojGqRWfHrW/tosjVievzG0jkEarAv0QzZPdxyXvt4K
# pKYh2M4Rob37bqlK2NsXVNtA4IhP2fjmWzV2Rlw0MvnpAp887ZJsnLv/Sy84wCtd
# USsIcZOOVcHP677MsIvfJRLNXRsVTbSBdQt/Sr8azQr8o1dLDz+9ssw8TkK6jqDg
# G5gJCxAaKdKVDnGTdqrM7zvwPa5V7TW42uX+FIuvJuA5CbIfg9oNVG1Ct2+TjvbB
# V1SWbjrbbzYxOwyhpIlmn7FdyDMfwgSx/muYdb6cfpk4VG1nf1HUZdFNGwi7I2TN
# T3eG2fyo1JRBFWYkX0ws8oS5E+D79oSRni4ESbiHIKXjc+DUZQBqo2EJ67qfj95w
# 6Pxa2S7rqaf6VQB56HNKgh7PrM30GdbNr+bDFsxnKhH9Dx34unank5xqO6eX08Zx
# 6ZkYR63WLFalH4n45L0ie4CEQccGp4rfgI96nQKMTyKaVid+Wwdrj7NNow1NsoLb
# 5thJakABBky5H3xIfklLUPW/iUalMIIIDDCCBvSgAwIBAgITVgABu7bhpG21mJHZ
# QgABAAG7tjANBgkqhkiG9w0BAQsFADBfMRMwEQYKCZImiZPyLGQBGRYDY29tMRQw
# EgYKCZImiZPyLGQBGRYEaXN0YTESMBAGCgmSJomT8ixkARkWAmRzMQ0wCwYDVQQK
# EwRpc3RhMQ8wDQYDVQQDEwZpc3RhQ0EwHhcNMjQxMjExMDc0MTIzWhcNMzQxMjA5
# MDc0MTIzWjCBiTETMBEGCgmSJomT8ixkARkWA2NvbTEUMBIGCgmSJomT8ixkARkW
# BGlzdGExEjAQBgoJkiaJk/IsZAEZFgJkczEMMAoGA1UECxMDUk8xMQ4wDAYDVQQL
# EwVVc2VyczERMA8GA1UECxMIRXh0ZXJuYWwxFzAVBgNVBAMTDlZhdGF2dSwgU2Vy
# YmFuMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAoYM3JlsEwWXq5j8b
# MjGACDtH0cSnyTYhrnzbsnS1jwi7YSeUF8m6K5b3W2mNoFvIl1nqKcG5GZ+Py0WQ
# XMjcjuGEkYlJzm9N9JskiygrQ5iVObJeqgu/I7iCU4yeopvK0YmxAYU5sdRqAxRl
# T6BnUzwBizIbldOqfq+P9dvXn0B214QKnksJLUbrIXIUSzwcZuU6m2ZHioEZvnbL
# vIT0vJL+jdO9aaJkpch6ohJ2FU4slxZwSWeF075KSymK4MhU3vqs5/KgA064bmSw
# IA5aEMgxxR+rhEJwbEPu23D2pmIrsY96HGhGCEHMoGTaTCfg8H+EbFDCvY/8ksJL
# Q7tZisu4u0M763klSoMCkDF0j3kXd0Ihmw0BnEqFMKzYqFzOge3fAVEvxn/sDyxb
# p7no9NYpYbP2I0yD0wbkoBsTPmslwjVATH72IK96mEYWBK8sHDGuYr7UUAUgwxak
# dM//1vrTJFZ8cUvDxCnguPSKyxO/TGgwkI690PosnuJV+jE9R80Z+sQt6hL5bQmR
# XK6a8RYPX87BFusg6OKXLMhuSAxsBHUxWcI1zV9arVgVW8H5WsLbYbyyq2Kp0Rps
# kmTeR9yS495+mKBT0CY4tgEEF0X9f8I6QynjjF9E5jT6Q102oNLSJU50nLad5huX
# 0FIWhhAxPVWpWmMARD/309GORfECAwEAAaOCA5QwggOQMDoGCSsGAQQBgjcVBwQt
# MCsGIysGAQQBgjcVCLTKFtf1CoTlnR2wqRODpsZjAoSjukSDsPk8AgFkAgESMBMG
# A1UdJQQMMAoGCCsGAQUFBwMDMAsGA1UdDwQEAwIHgDAbBgkrBgEEAYI3FQoEDjAM
# MAoGCCsGAQUFBwMDMB0GA1UdDgQWBBToORZ4AJvTSUSmtKMbnhr3LaHQCjAfBgNV
# HSMEGDAWgBTk1tgF+sBpXR4D4qcgY3pEq8wGTzCBmgYDVR0fBIGSMIGPMIGMoIGJ
# oIGGhixodHRwOi8vcGtpLmRzLmlzdGEuY29tL0NlcnRFbnJvbGwvaXN0YUNBLmNy
# bIYraHR0cDovL2NhLmRzLmlzdGEuY29tL0NlcnRFbnJvbGwvaXN0YUNBLmNybIYp
# aHR0cDovL3BraS5pc3RhLmNvbS9DZXJ0RW5yb2xsL2lzdGFDQS5jcmwwggGvBggr
# BgEFBQcBAQSCAaEwggGdMFMGCCsGAQUFBzAChkdodHRwOi8vcGtpLmRzLmlzdGEu
# Y29tL0NlcnRFbnJvbGwvUExLQVQzQ0EwMDIuZHMuaXN0YS5jb21faXN0YUNBKDEp
# LmNydDBSBggrBgEFBQcwAoZGaHR0cDovL2NhLmRzLmlzdGEuY29tL0NlcnRFbnJv
# bGwvUExLQVQzQ0EwMDIuZHMuaXN0YS5jb21faXN0YUNBKDEpLmNydDCBogYIKwYB
# BQUHMAKGgZVsZGFwOi8vL0NOPWlzdGFDQSxDTj1BSUEsQ049UHVibGljJTIwS2V5
# JTIwU2VydmljZXMsQ049U2VydmljZXMsQ049Q29uZmlndXJhdGlvbixEQz1yb290
# LERDPW5ldD9jQUNlcnRpZmljYXRlP2Jhc2U/b2JqZWN0Q2xhc3M9Y2VydGlmaWNh
# dGlvbkF1dGhvcml0eTBNBggrBgEFBQcwAoZBaHR0cDovL3BraS5pc3RhLmNvbS9D
# ZXJ0RW5yb2xsL1BMS0FUM0NBMDAyLmRzLmlzdGEuY29tX2lzdGFDQS5jcnQwMQYD
# VR0RBCowKKAmBgorBgEEAYI3FAIDoBgMFnNlcmJhbi52YXRhdnVAaXN0YS5jb20w
# UAYJKwYBBAGCNxkCBEMwQaA/BgorBgEEAYI3GQIBoDEEL1MtMS01LTIxLTMwMjQ5
# NDczNzItNDA2MDcyMjE3NS0xODExODQwMTk3LTg2NzE3MA0GCSqGSIb3DQEBCwUA
# A4IBAQAZLsD4oUtiVN+i30Axmz8rN71ldSTU2oPOPW0HFoSZ3CGE9HKGGO2nYf8b
# ratpJCDozlY+p1rlIuXSw2ZtV/8gz7pY88UNzk/Ys3K+Pu2rUCkiT2wgjBjMQthN
# t0Vw+4O/lx1dQEbidsm9D8bFxF+yaeKrCjbTbrgs9fgI8wJCF4jURKR7fHg4Kphj
# 2uu99zOwrtJKQMxEjhtmIkJUpco5R1m/T4AokAg4Mqq7Ob/d5OAODzPPO9gnwiKB
# Tty6HgX3ucHZIkVJoKtcvg4jFN0E+ieJwRP1R//XpRu4xZ+MwGyKAMsYN2uPJTcv
# cn3B0+Kq2Z+9Fiu1c09kzuHRhWCbMYIDFzCCAxMCAQEwdjBfMRMwEQYKCZImiZPy
# LGQBGRYDY29tMRQwEgYKCZImiZPyLGQBGRYEaXN0YTESMBAGCgmSJomT8ixkARkW
# AmRzMQ0wCwYDVQQKEwRpc3RhMQ8wDQYDVQQDEwZpc3RhQ0ECE1YAAbu24aRttZiR
# 2UIAAQABu7YwCQYFKw4DAhoFAKB4MBgGCisGAQQBgjcCAQwxCjAIoAKAAKECgAAw
# GQYJKoZIhvcNAQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEOMAwGCisG
# AQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFAWwTVYXgQIxRM4YQgxWaIpGOi4AMA0G
# CSqGSIb3DQEBAQUABIICAIDARJgqFbIDN4v7w7MPs2vCazTlKMv8C27f5CdAkoWV
# iQKMA2T34sD+UC8SyW5xXfqWIWYb531ADmfLnP/xJPMSMudJVb6i7yfAJrUkoH0/
# zazKZtfnLT81gLO7RJDUGWRvNpvO8A551nUr3zsXsIqdmkYwEQYtex72NUAalhw3
# 5Vr9Axq1qxRoakx8BK5EG1XoFkh5QeC59NiWW65Q1wXSg31rwPKCQokBOsisF+nc
# U6XSx4EdrozFY/LFOv+GRTceGxqlttDYvpw9XJj9vVHCiUBK9bBdGJKrWS1aE7jh
# RwinsUxiFREzMwcaMeDUTi5AKvQ2pX/fg/PLms/b17aL0CJ6twvgm3OucJKbzec1
# YpSCqXn5atju1meGKdKv36y3Bk7WjfrBqW+AMe66d2xifhWZ4iYbCqLk5pc0Esnl
# qrGvI2Vb2AQvPEGGNV5fTTU9nG0tlLIy5kR+kdylYoCyKJrAu99fsWvk6xNeHmpc
# 9Zu7ZtLXrQwPD2QUHVYL4QHML71EcPRX2/oA54rrLBcMYZ013PXAHfbYyBM4UQpH
# fpIWU4LdEzk+aX0mfREtgt5Wg67tQIsLTcUGadufWwNo48zKKlsgTgtHwlfEYZm3
# uIKTp8b1qybLAZtTYjhfjrVoDM6ssRvjQJ/JWiz3cH8RyK8M8SypQ7uWZyFF2gyH
# SIG # End signature block
