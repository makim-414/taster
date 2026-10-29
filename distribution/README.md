# Distribution

Files for the listings that go live with the public release. Nothing here is published by the repository itself;
`RELEASE.md` at the root has the order of steps.

- `acp-registry/taster/`: the folder to add to https://github.com/agentclientprotocol/registry (an `agent.json`
  checked against that repository's `agent.schema.json`, and a 16 px `currentColor` icon). The registry lists agents
  with Agent or Terminal auth; Taster has no account, so its terminal method is the one-time browser setup
  (`taster acp --setup`), which nothing requires before use.
