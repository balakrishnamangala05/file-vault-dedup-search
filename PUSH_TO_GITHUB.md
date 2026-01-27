# Complete Step-by-Step Guide: Push to GitHub

Follow these steps in order. Copy and paste each command into PowerShell.

---

## STEP 1: Create GitHub Repository (In Browser)

1. Go to: **https://github.com/new**
2. **Repository name:** `file-vault-dedup-search`
3. **Description (optional):** "Secure file vault with SHA-256 deduplication"
4. Choose **Public** or **Private**
5. **IMPORTANT:** Do NOT check any boxes (no README, no .gitignore, no license)
6. Click **"Create repository"**

After creating, you'll see a page with setup instructions. **Don't close it yet** - you'll need the repository URL.

---

## STEP 2: Initialize Git Locally

Open PowerShell and run:

```powershell
cd c:\project\file-vault-dedup-search
```

```powershell
git init
```

---

## STEP 3: Add All Files

```powershell
git add .
```

---

## STEP 4: Check What Will Be Committed (Optional)

```powershell
git status
```

This shows you what files will be committed.

---

## STEP 5: Create Initial Commit

```powershell
git commit -m "Initial commit: File Vault with SHA-256 deduplication and search"
```

---

## STEP 6: Set Default Branch to 'main'

```powershell
git branch -M main
```

---

## STEP 7: Add GitHub Remote

**Replace `YOUR_USERNAME` with your actual GitHub username:**

```powershell
git remote add origin https://github.com/YOUR_USERNAME/file-vault-dedup-search.git
```

**Example:** If your username is `johnsmith`, the command would be:
```powershell
git remote add origin https://github.com/johnsmith/file-vault-dedup-search.git
```

---

## STEP 8: Verify Remote (Optional)

```powershell
git remote -v
```

This should show your GitHub repository URL.

---

## STEP 9: Push to GitHub

```powershell
git push -u origin main
```

---

## STEP 10: Authentication

When prompted:

1. **Username:** Enter your GitHub username
2. **Password:** Enter a **Personal Access Token** (NOT your GitHub password)

### How to Get Personal Access Token:

1. Go to: **https://github.com/settings/tokens**
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. **Note:** `file-vault-push` (or any name)
4. **Expiration:** Choose duration (90 days recommended)
5. **Select scopes:** Check **`repo`** (this gives full repository access)
6. Click **"Generate token"** at the bottom
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
8. Paste this token when asked for password in Step 9

---

## ✅ Success!

If everything worked, you should see:
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/YOUR_USERNAME/file-vault-dedup-search.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

Your code is now on GitHub! Visit: `https://github.com/YOUR_USERNAME/file-vault-dedup-search`

---

## Troubleshooting

### Error: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/file-vault-dedup-search.git
```

### Error: "Permission denied" or "Authentication failed"
- Make sure you're using a Personal Access Token, not your password
- Verify the token has `repo` scope
- Try generating a new token

### Error: "fatal: not a git repository"
- Make sure you're in the project directory: `cd c:\project\file-vault-dedup-search`
- Run `git init` first

### Error: "git: command not found"
- Install Git: https://git-scm.com/download/win
- Restart PowerShell after installation

### To Check Git Status Anytime:
```powershell
git status
```

### To See Your Commits:
```powershell
git log --oneline
```

---

## Complete Command List (Copy All at Once)

If you want to copy all commands at once (after creating the repo on GitHub):

```powershell
cd c:\project\file-vault-dedup-search
git init
git add .
git commit -m "Initial commit: File Vault with SHA-256 deduplication and search"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/file-vault-dedup-search.git
git push -u origin main
```

**Remember to replace `YOUR_USERNAME` with your actual GitHub username!**
