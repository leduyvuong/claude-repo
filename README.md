# Vở Từ Vựng

Web học từ vựng tiếng Anh cho người Việt, chạy hoàn toàn trên trình duyệt.

- **Học từ mới:** 1.000 từ và câu giao tiếp chia theo 25 chủ đề, có phiên âm Anh-Mỹ, câu ví dụ và phát âm.
- **Ôn tập ngắt quãng:** thẻ ghi nhớ theo hộp Leitner. Từ nhớ tốt được hỏi lại thưa dần (1, 3, 7, 14, 30, 60 ngày).
- **Luyện tập:** chọn nghĩa, chọn từ, nghe chọn từ, nghe và viết chính tả.
- **Sổ từ:** tra cứu, lọc theo trạng thái, thêm từ của riêng bạn.
- **Viết câu với AI:** đặt câu với từ đã học, AI sửa lỗi và giải thích bằng tiếng Việt (chỉ chạy khi mở trang dưới dạng Claude Artifact).

## Chạy thử

Mở `index.html` bằng trình duyệt là dùng được. Tiến độ học được lưu trong trình duyệt (localStorage).
Khi mở trên claude.ai, tiến độ được lưu thêm vào tài khoản để dùng trên nhiều thiết bị.

## Sửa mã nguồn

Mã nằm trong `src/`. Sau khi sửa, chạy:

```bash
python3 build.py
```

để ghép lại thành `index.html`.

| File | Nội dung |
|---|---|
| `src/words.js`, `src/words-*.js` | Bộ từ vựng và câu giao tiếp theo chủ đề |
| `src/core.js` | Lưu trữ, lịch ôn tập, phát âm, thẻ từ |
| `src/views.js` | Trang Hôm nay, Học từ mới, Ôn tập |
| `src/practice.js` | Luyện tập và Sổ từ |
| `src/ai.js` | Chấm câu bằng AI, điền từ tự động, khởi động |
| `src/style.css`, `src/body.html` | Giao diện |
