# Income Tracker V2

**Income Tracker V2** là một ứng dụng web hiện đại giúp bạn dễ dàng theo dõi mọi nguồn thu nhập và quản lý các mục tiêu tài chính của mình. Ứng dụng được xây dựng với mục tiêu đơn giản, trực quan và đồng bộ hóa dữ liệu theo thời gian thực.

## ✨ Tính năng chính

*   **Quản lý nguồn thu nhập:** Thêm, xem, sửa, xóa và tạm dừng các nguồn thu nhập.
*   **Quản lý mục tiêu:** Tạo các mục tiêu tài chính và theo dõi tiến độ tích lũy.
*   **Dashboard thời gian thực:** Cung cấp cái nhìn tổng quan về tình hình tài chính với dữ liệu được cập nhật liên tục.
*   **Xác thực an toàn:** Đăng nhập nhanh chóng và an toàn bằng tài khoản Google.
*   **Thiết kế Responsive:** Hoạt động mượt mà trên cả máy tính để bàn và thiết bị di động.

## 🚀 Công nghệ sử dụng (Tech Stack)

*   **Frontend:** React, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui
*   **Backend (BaaS):** Supabase (Authentication, PostgreSQL Database, Realtime API)
*   **Deployment:** GitHub Pages

## 🚀 Bắt đầu

### Yêu cầu
*   Node.js (phiên bản 18.x trở lên)
*   npm / yarn / pnpm

### Cài đặt
1.  Clone repository về máy:
    ```bash
    git clone <URL_CUA_REPOSITORY>
    cd itracker-v2
    ```

2.  Cài đặt các dependencies:
    ```bash
    npm install
    ```

### Thiết lập biến môi trường

1.  Tạo một file `.env` ở thư mục gốc của dự án `itracker-v2`.
2.  Sao chép nội dung từ file `.env.example` (nếu có) hoặc thêm các biến sau:

    ```
    VITE_SUPABASE_URL="URL_DU_AN_SUPABASE_CUA_BAN"
    VITE_SUPABASE_ANON_KEY="ANON_KEY_CUA_BAN"
    ```
    > Bạn có thể lấy các giá trị này từ phần **Project Settings > API** trong dashboard Supabase của bạn.

### Chạy ứng dụng
*   Để chạy ứng dụng ở chế độ development:
    ```bash
    npm run dev
    ```
*   Mở trình duyệt và truy cập `http://localhost:5173`.

### Chạy kiểm thử (Tests)
```bash
npm test
```

## 部署 (Deployment)

Ứng dụng được cấu hình để tự động triển khai lên GitHub Pages mỗi khi có thay đổi được gộp vào nhánh `main` thông qua GitHub Actions.