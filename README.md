# StudyMate - Hỗ Trợ Học Tập Hutech
Chờ xíu xiu cho trang load nha | Bạn có thể truy cập dự án tại đây nè: <a href="https://studymate.onrender.com/" target="_blank">StudyMate</a>

## Giới thiệu
StudyMate là một ứng dụng web được thiết kế để hỗ trợ sinh viên Hutech trong việc quản lý học tập, theo dõi điểm số và kết nối cộng đồng.

## Tính năng chính
*   **Dự đoán điểm số:** Nhập điểm hiện tại để tính toán điểm cần thiết cho mục tiêu GPA.
*   **Lộ trình học tập:** Gợi ý lộ trình học tập dựa trên chuyên ngành.
*   **Cộng đồng:** Nơi sinh viên trao đổi, chia sẻ tài liệu và thảo luận.
*   **Quản lý tài khoản:** Cập nhật thông tin cá nhân, đồng bộ MSSV.
*   **Tích hợp AI:** Sử dụng AI để gợi ý và hỗ trợ giải đáp thắc mắc.

## Công nghệ sử dụng
*   **Backend:** ASP.NET Core (C#)
*   **Database:** MongoDB
*   **Frontend:** HTML, CSS, JavaScript (Vanilla + SignalR)
*   **AI:** Groq API
*   **Authentication:** Google OAuth, JWTCookie

## Cài đặt và Chạy ứng dụng

### Yêu cầu
*   .NET SDK 6.0 trở lên
*   MongoDB (Local hoặc Atlas)

### Các bước thực hiện
1.  **Clone repository:**
    ```bash
    git clone https://github.com/chunhanhoa/StudyMate.git
    cd StudyMate
    ```

2.  **Cấu hình môi trường:**
    *   Tạo file `appsettings.json` (nếu chưa có) và cấu hình connection string MongoDB.
    *   Cấu hình Google Client ID/Secret và Groq API Key trong biến môi trường hoặc `appsettings.json` (Lưu ý: Không commit file chứa key lên git).

3.  **Chạy ứng dụng:**
    ```bash
    dotnet run
    ```
    Ứng dụng sẽ chạy tại `http://localhost:5000` hoặc cổng được cấu hình.

## Triển khai (Deploy)
Dự án đã được cấu hình để deploy lên Render.com. Đảm bảo thiết lập các biến môi trường (Environment Variables) trên Dashboard của Render:
*   `Authentication__Google__ClientId`
*   `Authentication__Google__ClientSecret`
*   `ConnectionStrings__MongoDB`
*   `GROQ_API_KEY`
*   `MongoDB__DatabaseName`

## Tác giả
*   Chu Nhân Hòa | Nguyễn Thanh Hoàng | Nguyễn Khắc Huy | Ngô Trí Anh Vũ
