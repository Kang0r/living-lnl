// Vercel 함수 예시: /api/health
// API 키가 필요한 기능(AI, 식단 등)은 이 폴더에 함수로 만들고,
// 키는 Vercel 환경 변수(process.env.이름)에서만 읽는다. 프런트엔드 코드에 키를 넣지 않는다.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, time: new Date().toISOString() });
};
