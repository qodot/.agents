# Shortform Skills

숏폼 인플루언서 마케팅 캠페인을 위한 스킬 모음입니다.

## 폴더 구조

```
shortform-skills/
├── README.md
├── content-planner/     # 컨텐츠 기획
├── hook-planner/        # 후킹 기획
├── creator-planner/     # 크리에이터 선정
└── examples/            # 참고 기획서 (PDF)
```

## 스킬 목록

| 스킬 | 설명 | 사용 시점 |
|------|------|----------|
| **content-planner** | 숏폼 컨텐츠 기획서 생성 | 캠페인 기획 시작 |
| **hook-planner** | 첫 3초 후킹 기획 | 컨텐츠별 후킹 설계 |
| **creator-planner** | 크리에이터 선정 기획 | 기획서 완료 후 |

## 예제 기획서 (examples/)

| 파일명 | 카테고리 | 참고 포인트 |
|--------|----------|-------------|
| [메디필_미국] 바이럴 영상 기획안.pdf | 화장품 | 미국 시장 기획 |
| [웰라쥬] 바이럴 영상 기획안_4차.pdf | 화장품 | 정제된 기획 |
| [이니스프리] 바이럴 영상 기획안.pdf | 화장품 | 대형 브랜드 |
| [블랑두부] 콘텐츠 기획안.pdf | F&B | 식품 카테고리 |
| [불스원] 2차 기획안.pdf | 자동차용품 | 비화장품 |

> 모든 스킬에서 `../examples/` 경로로 참고할 수 있습니다.

## 권장 사용 순서

```
1. content-planner  →  컨텐츠 기획서 작성
       ↓
2. hook-planner     →  각 컨텐츠의 첫 3초 후킹 기획
       ↓
3. creator-planner  →  크리에이터 선정 기준 수립
```

## 사용 방법

```bash
# 컨텐츠 기획
/skill:content-planner

# 후킹 기획 (content-planner 내에서 자동 호출되거나 별도 사용)
/skill:hook-planner

# 크리에이터 선정
/skill:creator-planner
```

## 의존 도구

모든 스킬에서 공통으로 사용:
- `ask`: 사용자에게 객관식 질문
- `ask_multi`: 여러 객관식 질문 순차 수집
- `browser-tools`: 웹 페이지 조회 및 정보 수집 (필수 권장)

## 출력 파일

| 스킬 | 출력 파일 |
|------|----------|
| content-planner | `[브랜드명]_숏폼_기획서.md` |
| hook-planner | `[브랜드명]_후킹_기획.md` |
| creator-planner | `[브랜드명]_크리에이터_선정_가이드.md` |
