# tpcp-backend

Backend Node.js + Express + MongoDB cho hệ thống quản lý project, lời mời tham gia, profile và chat realtime (Socket.IO).

## Quick start

```bash
npm install
npm run dev # chạy với nodemon
# hoặc: npm start
```

## Cấu trúc thư mục (chi tiết)

```
.
├─ server.js                           # Khởi động app, HTTP, Socket.IO, boot services
├─ package.json
├─ package-lock.json
└─ src/
   ├─ config/
   │  ├─ cloudinary.js                # Cấu hình Cloudinary upload
   │  ├─ cronJobs.js                  # Cron cleanup, tác vụ định kỳ
   │  ├─ database.js                  # Kết nối MongoDB (Mongoose)
   │  ├─ email.js                     # Helper gửi email chung
   │  ├─ passport.js                  # Cấu hình Passport (Google OAuth,...)
   │  ├─ projectEmail.js              # Mẫu email cho Project/Invitation
   │  └─ socket.js                    # SocketManager (middleware JWT, events chat)
   │
   ├─ controllers/
   │  ├─ authcontroller.js            # Đăng ký/đăng nhập/verify/reset password
   │  ├─ ProjectInvitationController.js # REST cho lời mời/join request project
   │  ├─ profileController.js         # REST CRUD profile
   │  ├─ projectController.js         # REST CRUD project, members
   │  └─ chatController.js            # REST cho chat (conversations, messages)
   │
   ├─ middlewares/
   │  └─ auth.js                      # Middleware JWT, requireVerified/requireAdmin
   │
   ├─ models/
   │  ├─ user.js                      # User schema (auth)
   │  ├─ profile.js                   # Hồ sơ người dùng, privacy
   │  ├─ project.js                   # Project schema, settings
   │  ├─ projectMember.js             # Thành viên project, role/permissions
   │  ├─ ProjectInvitation.js         # Mã mời project, expiry/status
   │  ├─ ProjectJoinRequest.js        # Yêu cầu tham gia project
   │  ├─ conversation.js              # Cuộc trò chuyện (project/1v1)
   │  ├─ chatParticipant.js           # Người tham gia conversation
   │  ├─ chatMessage.js               # Tin nhắn, reactions, read_by
   │  ├─ campaignData.js              # (khác) dữ liệu chiến dịch
   │  ├─ chatGroup.js                 # (khác) nhóm chat cũ (nếu dùng)
   │  ├─ facebookPage.js              # (khác) trang Facebook
   │  ├─ kpi.js                       # (khác) KPI
   │  ├─ notification.js              # (khác) thông báo
   │  ├─ subscription.js              # (khác) gói dịch vụ
   │  ├─ task.js                      # (khác) task
   │  ├─ taskComment.js               # (khác) bình luận task
   │  └─ taskFile.js                  # (khác) file đính kèm task
   │
   ├─ routes/
   │  ├─ auth.js                      # /api/auth/*
   │  ├─ projectInvitationRoutes.js   # /api/projects/* (invites, join requests)
   │  ├─ profileRoutes.js             # /api/profile/*
   │  ├─ projectRoutes.js             # /api/projects/* (CRUD project, members)
   │  └─ chatRoutes.js                # /api/chat/* (conversations, messages)
   │
   ├─ services/
   │  ├─ authservice.js               # Nghiệp vụ auth + tokens
   │  ├─ ProjectInvitationService.js  # Nghiệp vụ lời mời/join project
   │  ├─ ProjectService.js            # Nghiệp vụ quản lý project/members
   │  ├─ ProfileService.js            # Nghiệp vụ profile
   │  └─ ChatService.js               # Nghiệp vụ chat (kèm emit realtime từ REST)
   │
   ├─ utils/
   │  ├─ apiResponse.js               # Helper chuẩn hóa JSON response
   │  └─ token.js                     # Tạo/verify JWT, các token phụ
   │
   ├─ validation/
   │  └─ auth.js                      # Joi schemas validate auth payloads
   │
   ├─ repositories/                   # (để trống nếu chưa dùng)
   └─ scripts/                        # (để trống nếu chưa dùng)
```

## Ghi chú quan trọng

- Socket.IO:

  - `src/config/socket.js` xác thực JWT bằng `decoded.id` (không phải `userId`).
  - Khi gửi tin nhắn qua REST (`ChatService.sendMessage`) hệ thống emit `new_message` qua `global.socketManager` để frontend nhận realtime mà không cần reload.
  - Server lưu `global.socketManager` tại `server.js` khi khởi tạo.

- Dòng đời chat:
  - Tham gia room: `join_conversation` (Socket.IO) kiểm tra quyền trong `chatParticipant`.
  - Gửi tin: REST POST → lưu `chatMessage` → emit `new_message` tới `conversation_<id>`.
  - Reactions/typing/read: emit qua các events tương ứng.

## Postman nhanh (Project Invitations)

1. Tạo mã mời

```
POST http://localhost:4000/api/projects/:projectId/invitations
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
Body: { "expiryDays": 30 }
```

2. Tham gia bằng mã mời

```
POST http://localhost:4000/api/projects/join
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
Body: { "inviteCode": "your_invite_code" }
```

3. Danh sách yêu cầu chờ

```
GET http://localhost:4000/api/projects/:projectId/join-requests
Authorization: Bearer YOUR_ACCESS_TOKEN
```

4. Phê duyệt yêu cầu

```
PUT http://localhost:4000/api/projects/join-requests/:requestId/approve
Authorization: Bearer YOUR_ACCESS_TOKEN
```

5. Từ chối yêu cầu

```
PUT http://localhost:4000/api/projects/join-requests/:requestId/reject
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
Body: { "reason": "Lý do (tùy chọn)" }
```

6. Gửi lời mời qua email

```
POST http://localhost:4000/api/projects/invitations/send
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
Body: { "inviteCode": "your_invite_code", "email": "recipient@example.com" }
```

7. Vô hiệu hóa mã mời

```
PUT http://localhost:4000/api/projects/invitations/:inviteCode/deactivate
Authorization: Bearer YOUR_ACCESS_TOKEN
```

8. Danh sách mã mời của project

```
GET http://localhost:4000/api/projects/:projectId/invitations
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Thay thế `:projectId`, `:requestId`, `:inviteCode` bằng giá trị thực, và dùng `YOUR_ACCESS_TOKEN` hợp lệ.
