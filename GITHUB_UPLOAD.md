# GitHub upload instructions

## 1. Create the repository on GitHub

1. Go to GitHub.
2. Click **New repository**.
3. Repository name suggestion: `guess_the_good_word`.
4. Keep it public or private as you prefer.
5. Do **not** add a README, `.gitignore`, or license on GitHub because this repository already contains them.
6. Click **Create repository**.

## 2. Upload from Ubuntu / Linux / macOS terminal

```bash
cd ~/projects/guess_the_good_word

git init
git add .
git commit -m "Initial commit: Guess the Good Word"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/guess_the_good_word.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

## 3. Upload from Windows PowerShell

```powershell
cd $HOME\projects\guess_the_good_word

git init
git add .
git commit -m "Initial commit: Guess the Good Word"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/guess_the_good_word.git
git push -u origin main
```

## 4. Future changes

```bash
git status
git add .
git commit -m "Describe your update"
git push
```

## 5. Common fix: remote already exists

```bash
git remote remove origin
git remote add origin https://github.com/YOUR-USERNAME/guess_the_good_word.git
git push -u origin main
```
