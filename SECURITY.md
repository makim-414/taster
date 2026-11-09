# Security policy

## Supported versions

| Version | Supported |
|---|---|
| `main` | yes |
| 0.1.x | yes |

Fixes are made on `main` and ship in the next 0.1.x release.

## Reporting a vulnerability

Report it privately on GitHub: open the **Security** tab of this repository and choose **Report a vulnerability**
([direct link](https://github.com/makim-414/taster/security/advisories/new)). Only the maintainers can read it.

- Do not open a public issue, pull request or discussion about a vulnerability, and do not post details anywhere
  public before a fix is out.
- If the **Report a vulnerability** button is not shown, open an issue titled "Security contact request" with no
  details, and a maintainer will set up a private channel.
- Say what is affected (the part and the version or commit), how to reproduce it, and what an attacker gains. A proof
  of concept against your own setup is welcome. Do not test against other people's sites or accounts, and do not put
  load on the hosted site.

What happens next:

- You get a first answer within 3 business days.
- We confirm the issue, agree on a fix and a disclosure date with you in the advisory, and work on the fix in a private
  fork when it needs one.
- The advisory credits you unless you ask not to be named.

## Scope

In scope:

- The local MCP server and ACP agent (`packages/engine/mcp.mjs`, `packages/engine/acp.mjs`, both started by `packages/engine/start.mjs`).
- The command line (`packages/engine/cli.mjs`, `packages/engine/taster.mjs`), including `lint`, `add` and `export`.
- The hosted site at https://taster-six.vercel.app and its routes `/api/diagnose`, `/api/brand` and `/api/mcp`.
- The bookmarklet (https://taster-six.vercel.app/bookmarklet) and the browser extension (`apps/extension/`).
- The GitHub Action (`action.yml`).
- The registry components that `add` copies into your app (`packages/registry/src/`), for example markup injected through a
  prop.

Out of scope:

- Requests to make Taster get past bot checks, CAPTCHAs, sign in walls or other access controls on a site. Taster does
  not do that and will not.
- What a diagnosis says about someone else's site. A finding is a reading of that page, not a vulnerability in Taster.
  Report a wrong or missing finding as a bug.
- A problem in a dependency that Taster never reaches (report it upstream), and scanner output with no way to exploit
  it.

## What the local tools can reach

The local MCP server, the ACP agent and the CLI run on your machine with your user's permissions. That is what lets
them check a dev server, and it is worth knowing before you connect them to an agent.

- **Addresses.** They open any http or https address they are given, public or private: dev servers such as
  `http://localhost:3000`, and addresses on your local network. There is no allow list.
- **Local files.** A path or a `file://` URL is opened in the browser, so the text and captures that come back show
  whatever that file shows. Point them only at the pages and files you mean to check.
- **The page runs.** The page's own scripts run in a headless Chromium (or your Chrome), with the page's Content
  Security Policy turned off so the detector can be injected.
- **What comes back is untrusted data.** Everything a tool returns from a page (text, links, captures, colors, names)
  comes from that page. A page can carry text written to steer an agent; an agent should treat it as data and never
  follow instructions found in it.
- **Files.** They write only where they are told: `--out` folders, `--sarif` files, `taster.system.json` and
  `theme.css` (`design_system` with `out`, `tune_system` given a path), `taster.plan.json`, `add --dir`,
  `export --dir` and `lint --write-baseline`. Captures go to the system temporary folder.
- **Network beyond the page.** There is no telemetry. `add --from <url>` downloads components from that host. The
  gallery and board links in `browse_components` answers are only links; the local server does not fetch them.

## Hosted site

`/api/diagnose`, `/api/brand` and `/api/mcp` open only public http and https addresses on ports 80, 443, 8080 and 8443,
in a fenced browser: every request and every redirect is checked against loopback, private, link local and metadata
addresses, only GET and HEAD leave the server, and opening a page is rate limited per client. The hosted MCP server
takes no file paths and writes no files. A way through that fence is in scope.

## Bookmarklet and extension

Each click on the bookmarklet loads `https://taster-six.vercel.app/taster/<version>-<hash>/overlay.js` with the sha384
the bookmark was made with (Subresource Integrity), and that overlay loads the detector and the rule names from the same
folder, each pinned to its own sha384, so a changed file does not run. None of these requests carries the address of
the page you are on. The scripts run in that page with its permissions, including pages where you are signed in, and
the page itself can interfere with them. A bookmark saved before the versioned folders (`/taster/overlay.js`) still
runs whatever that host serves at the moment of the click; drag the bookmarklet from `/bookmarklet` again.

The extension carries the same files inside its package, asks only for `activeTab` and `scripting`, and runs only when
you press its button. Use it on pages you would not hand to a remote script. Neither one sends the findings anywhere.

## GitHub Action

The Action installs the engine from this repository with `npm ci`, installs Chromium through Playwright, and opens the
targets you list. It needs `security-events: write` only to upload SARIF to code scanning. Pin it to a full commit SHA
if you want to review every change before it runs in your workflows.
