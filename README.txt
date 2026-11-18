미니홈피 BGM 설치 안내

1. bgm.css, bgm.js 파일을 index.html과 같은 폴더에 복사합니다.
2. MP3는 music 폴더에 넣고 bgm.js의 BGM_TRACKS에 경로를 적습니다.
3. index.html의 </head> 바로 앞에 다음을 추가합니다.
   <link rel="stylesheet" href="./bgm.css">
4. index.html의 </body> 바로 앞에 다음을 추가합니다.
   <script src="./bgm.js" defer></script>
5. bgm.js 상단 BGM_TRACKS에서 제목/종류/경로를 바꿉니다.

예시:
{ title: '내 음악', type: 'mp3', src: './music/mysong.mp3' },
{ title: '유튜브 음악', type: 'youtube', src: 'https://www.youtube.com/watch?v=영상ID' }

주의:
- 제공된 sample.mp3는 실제 파일이 아니므로 직접 음악 파일을 추가해야 합니다.
- 유튜브는 영상 소유자가 임베드를 허용해야 재생됩니다.
- 유튜브 영상은 펼친 플레이어 안에 표시되며 숨김 오디오로 사용하지 않습니다.
- 브라우저 정책상 사용자가 처음 ▶를 눌러야 소리가 납니다.
- 음악은 사용 권한이 있는 음원만 사용하세요.
- bgm.js는 페이지마다 다시 삽입하지 말고 index.html에서 한 번만 불러오세요.
