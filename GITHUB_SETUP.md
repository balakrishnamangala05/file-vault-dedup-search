# How to Push Code to GitHub

Follow these steps to push your code to GitHub:

## Step 1: Initialize Git Repository (if not already done)

Open PowerShell or Command Prompt in the project directory and run:

```powershell
cd c:\project\file-vault-dedup-search
git init
```

## Step 2: Add All Files

```powershell
git add .
```

## Step 3: Create Initial Commit

```powershell
git commit -m "Initial commit: File Vault with deduplication and search"
```

## Step 4: Create a New Repository on GitHub

1. Go to https://github.com
2. Click the "+" icon in the top right
3. Select "New repository"
4. Name it: `file-vault-dedup-search` (or any name you prefer)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 5: Add GitHub Remote

After creating the repository, GitHub will show you commands. Use the HTTPS URL:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/file-vault-dedup-search.git
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 6: Push to GitHub

```powershell
git branch -M main
git push -u origin main
```

You'll be prompted for your GitHub username and password (or personal access token).

## Alternative: Using GitHub CLI (if installed)

If you have GitHub CLI installed:

```powershell
gh repo create file-vault-dedup-search --public --source=. --remote=origin --push
```

## Troubleshooting

### If you get authentication errors:
- Use a Personal Access Token instead of password
- Generate one at: https://github.com/settings/tokens
- Select scope: `repo`

### If .git folder is locked:
- Close any IDE/editor that might be using it
- Delete `.git/config.lock` if it exists
- Try again

### To check current status:
```powershell
git status
```

### To see what will be committed:
```powershell
git status
git diff --cached
```
