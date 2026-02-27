---
name: tw
description: 텍스트와 이미지를 X(Twitter)와 Threads에 동시 포스팅. 트윗, 소셜미디어 포스팅, SNS 게시 요청 시 활성화.
---

# tw — X + Threads 동시 포스팅

## Setup

최초 1회 실행:

```bash
cd {baseDir} && npm install
```

### 크레덴셜 설정

`{baseDir}/.env` 파일에 아래 값을 설정한다. 인터랙티브 설정도 가능:

```bash
npx tsx {baseDir}/setup.ts
```

필요한 값:

| Platform | Key | 발급처 |
|----------|-----|--------|
| X | `X_API_KEY` | [developer.x.com](https://developer.x.com/en/portal/dashboard) → App → Keys and tokens |
| X | `X_API_SECRET` | 같은 페이지 |
| X | `X_ACCESS_TOKEN` | 같은 페이지 (Read and Write 권한 필요) |
| X | `X_ACCESS_SECRET` | 같은 페이지 |
| X | `X_USERNAME` | 본인 X 핸들 (@없이) |
| Threads | `THREADS_USER_ID` | [developers.facebook.com](https://developers.facebook.com/) → App → API 설정 |
| Threads | `THREADS_ACCESS_TOKEN` | Graph API Explorer에서 long-lived token 생성 |
| Threads | `THREADS_USERNAME` | 본인 Threads 핸들 (@없이) |

`.env` 예시:

```env
X_API_KEY=abc123
X_API_SECRET=def456
X_ACCESS_TOKEN=ghi789
X_ACCESS_SECRET=jkl012
X_USERNAME=myhandle

THREADS_USER_ID=12345678
THREADS_ACCESS_TOKEN=THQWERTY...
THREADS_USERNAME=myhandle
```

## Usage

### 텍스트만:

```bash
npx tsx {baseDir}/post.ts --text "Hello world!"
```

### 텍스트 + 이미지:

```bash
npx tsx {baseDir}/post.ts --text "Check this out!" --image /path/to/image.jpg
```

## Workflow

사용자가 이 스킬을 호출하면:

1. 사용자에게 **게시할 텍스트**를 물어본다
2. **이미지 첨부 여부**를 물어본다. 옵션은 2개만: `없음`, `Type something`(기본값, 파일 경로 직접 입력)
3. `post.js`를 실행하여 X와 Threads에 동시 포스팅한다
4. 결과(성공 URL 또는 에러)를 보고한다

한 플랫폼만 설정되어 있으면 해당 플랫폼에만 포스팅한다.

## Notes

- 지원 이미지: JPEG, PNG, GIF, WEBP
- 이미지 최대 5MB
- Threads 이미지는 catbox.moe를 통해 임시 업로드 후 URL로 전달
- Threads 토큰은 60일 후 만료. 갱신:
  ```bash
  curl "https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=YOUR_TOKEN"
  ```
