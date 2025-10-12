# marketing-backend

Scaffold for a Node.js + Express + MongoDB backend.  
**Per your request:** only the **Mongoose schemas** are implemented under `src/models/`.  
Other folders exist with `.gitkeep` placeholders for later code.

## Quick start

```bash
npm install
cp .env.example .env
# then implement server, routes, etc.
```

## Structure

```
src/
  config/
  controllers/
  middlewares/
  models/         <-- all schema files here
  repositories/
  routes/
  scripts/
  services/
  utils/
  validation/
```

Generated at 2025-09-19T02:47:24.411852

1. Tạo mã mời cho project
   URL: POST http://localhost:4000/api/projects/:projectId/invitations
   Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

Body:
json{
"expiryDays": 30
} 2. Tham gia project bằng mã mời
URL: POST http://localhost:4000/api/projects/join
Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

Body:
json{
"inviteCode": "your_invite_code"
} 3. Lấy danh sách yêu cầu tham gia đang chờ xử lý
URL: GET http://localhost:4000/api/projects/:projectId/join-requests
Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN

4. Phê duyệt yêu cầu tham gia
   URL: PUT http://localhost:4000/api/projects/join-requests/:requestId/approve
   Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN

5. Từ chối yêu cầu tham gia
   URL: PUT http://localhost:4000/api/projects/join-requests/:requestId/reject
   Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

Body:
json{
"reason": "Lý do từ chối (không bắt buộc)"
} 6. Gửi lời mời qua email
URL: POST http://localhost:4000/api/projects/invitations/send
Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

Body:
json{
"inviteCode": "your_invite_code",
"email": "recipient@example.com"
} 7. Vô hiệu hóa mã mời
URL: PUT http://localhost:4000/api/projects/invitations/:inviteCode/deactivate
Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN

8. Lấy danh sách mã mời của project
   URL: GET http://localhost:4000/api/projects/:projectId/invitations
   Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN

Trong tất cả các URL trên, hãy thay thế:

:projectId với ID thực tế của project
:requestId với ID thực tế của yêu cầu tham gia
:inviteCode với mã mời thực tế
YOUR_ACCESS_TOKEN với JWT token hợp lệ sau khi đăng nhập
