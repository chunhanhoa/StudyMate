## StudyMate – Tư vấn, hỗ trợ sinh viên

Chờ xíu xiu cho trang load nha | Bạn có thể truy cập dự án tại đây nè: <a href="https://studymate-bior.onrender.com" target="_blank">StudyMate</a>

### Giới thiệu
StudyMate là một ứng dụng web được thiết kế để hỗ trợ sinh viên HUTECH
trong việc quản lý học tập, theo dõi điểm số và kết nối cộng đồng.


## Tính năng chính

### Học tập & Đào tạo
*   **Dự đoán điểm số:** Tính toán điểm cần đạt để đạt mục tiêu GPA mong muốn.
*   **Lộ trình học tập:** Gợi ý môn học và lộ trình dựa trên chuyên ngành và kết quả hiện tại.
*   **Tra cứu quy chế:** Tích hợp Sổ tay sinh viên, giải đáp thắc mắc về tín chỉ, quy định.
*   **Import bảng điểm:** Hỗ trợ nhập dữ liệu điểm số nhanh chóng từ file Excel.
*   **Ôn tập trắc nghiệm (AI):** Tự động tạo bài kiểm tra kiến thức theo chủ đề nhờ AI.

### Rèn luyện & Phong trào
*   **Sinh viên 5 Tốt:** Hệ thống đăng ký, xét duyệt và theo dõi tiêu chí danh hiệu SV5T.
*   **Hoạt động ngoại khóa:** Cập nhật tin tức và quản lý điểm rèn luyện cá nhân.
*   **Tập thể tiên tiến:** Hỗ trợ tính điểm và theo dõi tiêu chí lớp chi đoàn tiên tiến.

### Cộng đồng & Kết nối
*   **Diễn đàn sinh viên:** Trao đổi, thảo luận và chia sẻ tài liệu học tập (Real-time).
*   **Quản lý hồ sơ:** Đồng bộ thông tin cá nhân, MSSV và cập nhật ảnh đại diện.

## Công nghệ sử dụng
*   **Backend:** ASP.NET Core (C#)
*   **Database:** MongoDB
*   **Frontend:** HTML, CSS, JavaScript (Vanilla + SignalR)
*   **AI:** Groq API, Llama 3
*   **Authentication:** Google OAuth, JWTCookie

## Triển khai (Deploy)
Dự án đã được cấu hình để deploy lên Render.com. Đảm bảo thiết lập các biến môi trường (Environment Variables) trên Dashboard của Render:
*   `Authentication__Google__ClientId`
*   `Authentication__Google__ClientSecret`
*   `ConnectionStrings__MongoDB`
*   `GROQ_API_KEY`
*   `MongoDB__DatabaseName`
### Tác giả
Chu Nhân Hòa | Nguyễn Thanh Hoàng | Nguyễn Khắc Huy | Ngô Trí Anh Vũ