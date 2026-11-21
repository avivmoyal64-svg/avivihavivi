# Resume picture kit

Updates the fighter "resume" pictures in `r/<slug>.jpg` after each UFC event.
The owner reviews every picture before anything is pushed.

## Workflow (run after each event)

1. **Find the results.** In Supabase (project `hauxmxemyvgbgkbholln`), read
   `site_data` key `events`. `value.last` is the event that just finished.
   `value.history` holds every result keyed `e<event>-<a>-vs-<b>` →
   `{w, m: DEC|KO/TKO|SUB|DRAW|NC, r, nc}`.
   Check `history` as well as `last.fights`, because hand-added prelims only appear in `history`.
2. **Pick the fighters.** A fighter needs a picture if `r/<slug>.jpg` exists,
   where slug = lowercase, accents stripped, non-alphanumerics → `-`.
   Skip a fighter whose picture already shows that fight.
3. **Build each picture** with `tilekit.py`, writing the output to a work folder.
   Never edit `r/` directly before approval.
   - Run `python3 grid.py <slug>` and `python3 zg.py <slug> x0 y0 x1 y1 scale`
     first to measure tile positions. Every picture has its own layout.
   - **Tile layouts:** the new fight goes in the first slot (top-left), and every
     older tile moves one slot later in reading order. Add a row (extend the
     canvas) when the grid is full. See `rebuild()` and the examples
     (`examples/do_*.py`, one per fighter already done).
   - **Opponent faces:** `face_local(slug)` cuts the opponent's headshot
     out of the base64 `pic` in `index.html`. Extract the pics first with the snippet below.
     For opponents without a profile, use ESPN or ufc.com headshots fetched in a browser.
     Shell network access is blocked.
   - **Colours:** follow each picture's own style. If its losses show the
     opponent in grey, grey the winner on a loss tile (`grey_rgba`).
     Grey only the person, not the tile background.
   - **Labels:** use DEC / KO / TKO / SUB, matching the method exactly.
     ESPN "KO/TKO" should be KO or TKO as the official result says.
   - **Names:** W is green, L is red, D is gold. Redraw every name in Anton
     (`draw_name`) when tiles move, so nothing overlaps.
   - **Table-style pictures** (ESPN fight-history screenshots): use
     `table_insert()` to add a new top row.
   - **Placeholder tiles** ("SOON" / "?"): replace them with the real result
     instead of adding a new tile.
4. **Show the owner.** Make before | after composites, one per fighter, and
   send them all. **Do not push.** Wait for approval and apply any fixes they ask for.
5. **Publish** only after approval. Copy the files into `r/`, commit, and push
   to `main` (Vercel deploys automatically).

Extract embedded headshots:

```python
import re,base64
s=open('index.html').read()
for m in re.finditer(r'"res": "r/([^"]+)\.jpg", "pic": "data:image/webp;base64,([A-Za-z0-9+/=]+)"',s):
    open(f'pics/{m.group(1)}.webp','wb').write(base64.b64decode(m.group(2)))
```

`tilekit.py` expects `W='/home/claude/work/'` (work folder) and
`R` = the repo's `r/` folder; adjust the two constants if paths differ.
