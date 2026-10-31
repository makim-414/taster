# Taster

프론트엔드에서 AI 티가 나는 곳(슬롭)을 찾고, 그 자리를 같은 일을 더 잘하는 패턴으로 갈아 끼우거나, 처음부터
슬롭 없이 화면을 짓습니다.

Taster 는 코딩 에이전트(Claude Code, Codex, Cursor 등 `SKILL.md` 를 읽는 모든 도구)에 넣어 쓰는 스킬이자
플러그인입니다. 에이전트는 세 가지를 함께 씁니다.

- **규칙.** 잴 수 있을 만큼 정확하게 적은 슬롭 목록입니다. 대문자에 넓은 자간을 준 라벨, 색을 옅게 깐 알약
  배지, 카드 왼쪽의 두꺼운 색 띠, 이모지 불릿, 똑같은 아이콘 카드 세 장, 단어 중간에서 끊기는 한글 줄바꿈
  같은 것들입니다. 대부분은 `rules/detect.js` 가 실제 브라우저에서 잽니다.
- **패턴 분류 체계.** 방문자가 하려는 일(숫자 하나 보기, 요금제 비교, 믿을 근거 확인, 상태 표시)과 화면 종류
  (랜딩, 대시보드, 앱, 쇼핑, 읽을거리, 로그인, AI 대화)로 정리한 재사용 디자인 답안입니다. 규칙마다 그것을
  고치는 패턴이 연결돼 있습니다.
- **컴포넌트 모음.** 토큰으로 만든 React 컴포넌트입니다. 설치할 패키지 없이 필요한 파일만 복사해 씁니다.

설치 없이 써 보기: https://taster-six.vercel.app 에 주소를 넣으면 데스크톱과 폰 폭 캡처 위에 걸린 규칙을
표시해 줍니다.

## 하는 일

시작할 때 늘 한 가지를 먼저 묻습니다. **"이미 있는 사이트인가요, 아니면 새로 지을까요?"** 답에 따라 길이 갈립니다.
어느 길이든 중간에 그 사이트의 브랜드를 흡수합니다. 브랜드 색, 글꼴, 로고를 읽어 토큰 테마(`theme.css`)로 만들고,
성공·실패 색도 브랜드 색과 헷갈리지 않게 맞춥니다.

| 길 | 넣는 것 | 받는 것 |
|---|---|---|
| 이미 있는 사이트, 코드가 작업 폴더에 있음: 진단 후 교체 | 주소나 개발 서버, 그리고 코드 | 슬롭인 곳마다 표시한 캡처, 그다음 내 코드에서 그 자리를 갈아 끼우고 다시 검사해 깨끗해진 페이지 |
| 이미 있는 사이트, 주소만 있음: 진단 후 다시 짓기 | 주소(빌더로 만든 사이트, 고칠 수 없는 템플릿, 코드를 잃어버린 사이트) | 같은 글, 링크, 브랜드를 패턴으로 다시 지은 새 페이지. 검사 0건을 확인하고 원본과 나란히 보여 줌 |
| 새 사이트: 빌드 | 제품, 대상, 화면 종류, 실제 내용 | 패턴으로만 조립하고 미리 검사한 새 화면 |

`examples/rebuild/` 에 다시 짓기 예시가 있습니다. AI 티 나는 랜딩(규칙 17개 걸림)을 다시 지어 두 폭 모두 0건,
제목·버튼·메뉴는 하나도 빠지지 않고 브랜드 색도 그대로입니다. `node engine/scripts/check-rebuild-example.mjs` 로
확인합니다.

## 설치

스킬을 지원하는 에이전트:

```bash
npx skills add https://github.com/makim-414/taster --skill taster
```

Claude Code 플러그인:

```text
/plugin marketplace add makim-414/taster
/plugin install taster@taster
```

MCP 서버(실제 브라우저로 진단, 교체 부품 제안, 패턴·컴포넌트 가져오기)는 Claude Code 플러그인을 설치하면 함께
켜집니다. 다른 MCP 도구에서는 리포를 받은 뒤 `engine/start.mjs` 를 연결합니다.

```bash
claude mcp add taster -- node /path/to/taster/engine/start.mjs
```

### 내 앱에 부품 넣기

```bash
node engine/cli.mjs add blocks/button blocks/citations --dir src/components/taster
```

부품마다 그 부품이 import 하는 파일과 토큰 파일을 함께 복사합니다. shadcn 같은 다른 CLI 는 필요 없습니다. 클론
없이 받으려면 `--from https://taster-six.vercel.app` 를 붙이세요. 자세한 내용은 `registry/README.md`.

### MCP 없는 에이전트용 규칙 파일

`exports/` 에 규칙을 AGENTS.md, Claude Code, Cursor, Windsurf, Cline, GitHub Copilot, Gemini CLI 용 지침 파일로
뽑아 두었습니다(`rules/rules.json` 에서 생성). `node engine/cli.mjs export all --dir <내 앱>` 은 각 도구가 읽는 자리에
파일을 넣고, 같이 쓰는 파일에서는 내 글을 그대로 둡니다. 자세한 내용은 `exports/README.md`.

### PR 검사 (GitHub Action)

`uses: makim-414/taster@main` 에 `targets`(파일 경로나 주소, 한 줄에 하나)를 주면 결과를 작업 요약과 SARIF 로 남기고,
코드 스캔에 올려 바뀐 파일 위에 표시하며, `fail-on`(기본 high) 이상이면 단계를 실패시킵니다. 코드 스캔이 없으면
`upload-sarif: 'false'`. 로컬에서는 `node engine/cli.mjs <대상...> --sarif taster.sarif`.

### 보고 있는 페이지 재기 (북마클릿과 확장)

[taster-six.vercel.app/bookmarklet](https://taster-six.vercel.app/bookmarklet) 의 북마클릿을 북마크 막대로 끌어 두고
아무 페이지에서나 누르면, 걸린 곳에 테두리를 치고 규칙 목록을 띄웁니다. 외부 스크립트를 막는 사이트에서는
`extension/` 폴더를 크롬이나 엣지에 압축해제 확장으로 불러오세요(`activeTab`, `scripting` 권한만 씁니다).

### 설치 없이 쓰기 (원격 MCP)

같은 MCP 서버가 `https://taster-six.vercel.app/api/mcp` 에서 돌아갑니다(Streamable HTTP). 원격 MCP 서버로 넣으면
설치할 것이 없습니다.

```bash
claude mcp add --transport http taster https://taster-six.vercel.app/api/mcp
```

Cursor 는 `.cursor/mcp.json` 에 `{ "mcpServers": { "taster": { "url": "https://taster-six.vercel.app/api/mcp" } } }`.
claude.ai 와 ChatGPT 는 같은 주소를 사용자 지정 커넥터로 넣습니다. 원격 서버에는 로컬 파일을 읽는 두 도구
(`extract_content`, `brand_theme`)를 뺀 모든 도구가 있고, `diagnose` 는 공개 http(s) 주소만 받으며 사용자마다 횟수
제한이 있습니다. 로컬 파일과 전체 도구는 위의 플러그인으로 쓰세요.

### 에디터에서 쓰기 (ACP)

`engine/acp.mjs` 는 [Agent Client Protocol](https://agentclientprotocol.com) 을 말하므로 에이전트 패널이 있는
에디터에서 Taster 를 바로 돌릴 수 있습니다. 안에 모델은 없고 슬래시 명령에 엔진 결과로 답합니다(`/start`,
`/diagnose <주소나 파일>`, `/extract <주소>`, `/brand <주소>`, `/explain <규칙 id>`, `/rules`, `/help`). 교체나
다시 짓기는 MCP 를 쓰는 에이전트 안에서 스킬로 하세요. 에디터에는 `engine/start.mjs acp` 를 넣으면 됩니다. 처음
켤 때 엔진 의존성을 알아서 설치합니다. Zed 의 `settings.json` 에는 이렇게 넣습니다.

```json
{
  "agent_servers": {
    "Taster": {
      "type": "custom",
      "command": "node",
      "args": ["/path/to/taster/engine/start.mjs", "acp"],
      "env": {}
    }
  }
}
```

JetBrains IDE 는 같은 `agent_servers` 모양(`type` 없이)을 `~/.jetbrains/acp.json` 에서 읽습니다. 실행 파일의 전체
경로를 원하므로 `command` 에는 `which node` 결과를 넣으세요. 다른 ACP 클라이언트(Neovim, Emacs 등)도 같은 명령과
인자를 넣으면 됩니다.

설치한 뒤 Claude Code 에서 `/taster` 를 치면(또는 에이전트에게 "Taster 시작해줘") 이미 있는 사이트인지 새로
지을지부터 묻고 이어 갑니다. 바로 말해도 됩니다. "이 사이트 슬롭 진단해줘", "러버블로 만든 내 사이트 AI 티 안
나게 다시 지어줘", "이 제품 요금제 페이지를 AI 티 안 나게 만들어줘".

## 한국어 웹

한글 줄바꿈(`word-break: keep-all`), 한글 글꼴 대체 순서, 한글 행간, `lang="ko"` 같은 규칙이 따로 있습니다.
영어권 도구들이 거의 다루지 않는 부분입니다.

## 라이선스

MIT. 컴포넌트 모음에 함께 들어간 외부 코드는 `registry/THIRD_PARTY_NOTICES.md` 에 적었습니다.
