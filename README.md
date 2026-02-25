# Math Fluency + Working Memory Trainer

Browser-only web app:

- **Start**: Enter name and ID, then Start.
- **Part 1 (20 s)**: 9×9 multiplication, one problem at a time. Simple feedback; after 3 wrong in a row, an attention message appears.
- **Part 2 (5 min)**: 9×9 working memory — choose answers, then recall them in order. Level increases on success; drops after 2 consecutive sequence errors.

## Run locally

```bash
cd math-fluency-app
python3 -m http.server 4177
```

Open **http://localhost:4177/** in your browser.

## Host on GitHub Pages

1. `git init` → `git add .` → `git commit -m "Add math fluency app"`
2. Create repo on GitHub, then: `git remote add origin <url>` → `git push -u origin main`
3. Settings → Pages → Deploy from branch `main`, folder `/root`
