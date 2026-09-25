# Vở Từ Vựng

Web học từ vựng tiếng Anh cho người Việt, chạy hoàn toàn trên trình duyệt.

- **Học từ mới:** 1.000 từ và câu giao tiếp chia theo 25 chủ đề, có phiên âm Anh-Mỹ, câu ví dụ và phát âm.
- **Ôn tập ngắt quãng:** thẻ ghi nhớ theo hộp Leitner. Từ nhớ tốt được hỏi lại thưa dần (1, 3, 7, 14, 30, 60 ngày).
- **Trò chơi:** Trắc nghiệm, Lật thẻ ghép đôi, Nối nhanh, Đúng hay Sai, Mưa từ, Xếp chữ, Xếp câu, Đấu trùm; có XP, cấp độ, combo, kỷ lục và nhiệm vụ mỗi ngày.
- **Sổ từ:** tra cứu, lọc theo trạng thái, thêm từ của riêng bạn.
- **Nói với AI:** trò chuyện nhập vai 8 tình huống (quán cà phê, phỏng vấn, hỏi đường…), AI sửa lỗi và gợi ý câu đáp.
- **Hành trình - **Viết câu với AI:** huy hiệu:** bản đồ 25 chặng, từ của ngày, 12 huy hiệu; thẻ ôn tập lật 3D, vuốt để chấm.
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
| `src/practice.js` | Trắc nghiệm và Sổ từ |
| `src/fx.js` | Âm thanh, pháo giấy, XP, cấp độ, nhiệm vụ, khung trò chơi |
| `src/games.js`, `src/games2.js`, `src/boss.js` | Các trò chơi |
| `src/journey.js` | Hành trình, từ của ngày, huy hiệu, thẻ vuốt |
| `src/chat.js` | Trò chuyện nhập vai với AI |
| `src/ai.js` | Chấm câu bằng AI, điền từ tự động, khởi động |
| `src/style.css`, `src/body.html` | Giao diện |

## MÙA — trang thương mại concept

Thư mục `mua/` là một website riêng: cửa hàng thời trang hư cấu **MÙA**, concept "mua đồ theo nhiệt độ ngoài trời". Một file `mua/index.html` duy nhất, mở trực tiếp là chạy. Flow đủ: bìa → catalogue (nhiệt kế 18–38°C) → trang sản phẩm → giỏ → đặt hàng COD → xác nhận.
