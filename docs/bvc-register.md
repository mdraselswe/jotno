# BVC register

Jotno keeps a copy of the vets the Bangladesh Veterinary Council (BVC) lists as
registered, so an admin can check a vet's profile against it before verifying.

## What is stored

`bvc_register` holds one row per BVC number:

- the number as printed;
- the name in Bangla;
- the division;
- the PDF page the row is on;
- which list it came from (`bvc_sources`).

Addresses in the PDF are **not** stored. Both tables are server-only: RLS is on
with no policies, and `anon`/`authenticated` have no grants.

Vets add their **name as on their NID, in Bangla** (`providers.name_nid_bn`) to
their profile. Nobody asks for or stores the NID number. Changing this name,
like the display name or the BVC number, sends a verified vet back for a
re-check.

To send the profile for review, a vet must upload **both the BVC certificate
and the NID** (`REQUIRED_DOCS` in `src/features/providers/checklist.ts`); the
documents card says so in a highlighted box. The NID photo is checked by eye and
kept in the private bucket; its number is never typed in or stored.

An admin can still verify any vet who isn't verified yet: a draft never sent,
a profile sent back for changes, or one missing a required document. The vet
page warns first, and the audit entry records what was skipped
(`meta.override`: `draft`, `rejected`, `missingDocs`), shown in the vet's history.

## How a profile is matched

`registerStatus` (`src/features/admin/bvc-match.ts`) gives one of these:

| Status       | Meaning                                                         |
| ------------ | --------------------------------------------------------------- |
| `same`       | NID name and list name agree (titles, spaces, spellings aside)  |
| `close`      | a word more or less, or a letter or two off                     |
| `different`  | another name under this number                                  |
| `notFound`   | the number is in no imported list                               |
| `unreadable` | the number is listed, but the PDF's text for the name is broken |
| `noNidName`  | the number is listed, the vet gave no NID name                  |
| `noNumber`   | no BVC number on the profile                                    |

Names are compared by `compareNames` (`src/lib/bangla-name.ts`). The list is
public, so a match is a hint, not proof: the admin still checks the certificate
and NID uploads, and verifying stays manual.

The admin vet page shows the profile and the list side by side. The vets list
has a "Register" column and two filters: not in the list (`?bvc=missing`) and
name to check (`?bvc=check`).

## When BVC publishes a new list

**A voter list (PDF)**, usually published before a council election, on
bvc.gov.bd. Save the PDF outside the repo (don't commit it), then run:

```sh
# Look first: counts per division, skipped rows, samples. Writes nothing.
pnpm bvc:import ~/Downloads/voter-list.pdf --dry-run

# Then for real (local database, from .env.local):
pnpm bvc:import ~/Downloads/voter-list.pdf --title "Final voter list 2026" \
  --url "https://bvc.gov.bd/…" --published 2026-05-14
```

To load the cloud databases, set `DATABASE_URL` to that database for the one
command (live, then demo). Rows are matched on the number: vets already in the
register are updated, new ones added, nobody doubled. Running the same file
again changes nothing. A row whose name can't be read never wipes a name read
from an earlier list.

**A registration notice** with a few new vets: an admin adds each one on
`/admin/bvc` (number, Bangla name, division, link to the notice). The same
number again corrects the row. Adding and removing rows are in the audit log.

## Rows the PDF text can't give

The PDF is Bijoy (SutonnyMJ) text, which `src/lib/bijoy.ts` converts to Unicode.
Some rows were typed in a Unicode font whose PDF text is broken: only some
letters come out. In the 2026 list that is about 850 of 10,420 rows (about
400 with a number but no name, about 450 with neither).

These rows are read by eye from the page images:

```sh
# 1. Cut the rows out of the pages into PNG sheets (20 rows each) and a
#    fixes.csv with what the text did give. Keep the folder outside the repo.
pnpm bvc:import ~/Downloads/voter-list.pdf --review ~/bvc-review

# 2. Fill reg_no (ASCII digits, leading zeros as printed) and name_bn (as
#    printed) for each row in fixes.csv, reading the sheet it names. Leave
#    name_bn blank where the print shows only empty boxes.

# 3. Import with the fixes. Rows left blank in the CSV stay as before.
pnpm bvc:import ~/Downloads/voter-list.pdf --fixes ~/bvc-review/fixes.csv \
  --title "Final voter list 2026" --url "https://bvc.gov.bd/…" --published 2026-05-14
```

Only the number, name and reg columns are cut out (no addresses). Check a dry
run with the fixes first (`--dry-run --fixes …`): it lists reg numbers out of
order in their division (the list is sorted by number within each division),
which is where a misread digit shows. A few are out of order in the PDF itself,
and a few vets are listed twice.

Rows still without a readable name show as `unreadable`, and the admin compares
by eye; a row without a number is skipped, so such a vet shows `notFound` and the
admin adds them on `/admin/bvc` after checking the PDF. The import prints these
counts for each new list.
