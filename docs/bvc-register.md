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

## Limits of the 2026 PDF

The PDF is Bijoy (SutonnyMJ) text, which `src/lib/bijoy.ts` converts to Unicode.
Some rows were typed in a Unicode font whose PDF text is broken: only some
letters come out.

- About 400 rows have a readable number but no readable name. They are stored
  with their page, show as `unreadable`, and the admin compares by eye.
- About 570 rows have a broken number too, so they are skipped. A vet among them
  shows `notFound`: the admin checks the PDF, then adds them by hand on
  `/admin/bvc`.

Text extraction can't fix these rows; OCR of those pages would. The import
prints how many rows it skipped, so the numbers above can be checked for each
new list.
