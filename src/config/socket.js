const jwt = require("jsonwebtoken");
const User = require("../models/user");
const ChatParticipant = require("../models/chatParticipant");
const ChatMessage = require("../models/chatMessage");

class SocketManager {
  constructor(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    //Middleware xác thực JWT
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.split(" ")[1];

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
          return next(new Error("Authentication error: User not found"));
        }

        socket.userId = user._id;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error("Authentication error: Invalid token"));
      }
    });
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(
        `User ${socket.user.name} connected with socket ${socket.id}`
      );

      // Join user vào room của chính họ
      socket.join(`user_${socket.userId}`);

      // Join vào các conversation mà user tham gia
      this.joinUserConversations(socket);

      // Xử lý join conversation
      socket.on("join_conversation", async (data) => {
        await this.handleJoinConversation(socket, data);
      });

      // Xử lý leave conversation
      socket.on("leave_conversation", async (data) => {
        await this.handleLeaveConversation(socket, data);
      });

      // Xử lý gửi message
      socket.on("send_message", async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Xử lý typing
      socket.on("typing", async (data) => {
        await this.handleTyping(socket, data);
      });

      // Xử lý stop typing
      socket.on("stop_typing", async (data) => {
        await this.handleStopTyping(socket, data);
      });

      // Xử lý đánh dấu đã đọc
      socket.on("mark_as_read", async (data) => {
        await this.handleMarkAsRead(socket, data);
      });

      // Xử lý reaction
      socket.on("add_reaction", async (data) => {
        await this.handleAddReaction(socket, data);
      });

      // Xử lý xóa reaction
      socket.on("remove_reaction", async (data) => {
        await this.handleRemoveReaction(socket, data);
      });

      // Xử lý disconnect
      socket.on("disconnect", () => {
        console.log(`User ${socket.user.name} disconnected`);
        this.handleDisconnect(socket);
      });
    });
  }

  async joinUserConversations(socket) {
    try {
      const conversations = await ChatParticipant.find({
        user_id: socket.userId,
        status: "active",
      }).select("conversation_id");

      conversations.forEach((participant) => {
        socket.join(`conversation_${participant.conversation_id}`);
      });
    } catch (error) {
      console.error("Error joining user conversations:", error);
    }
  }

  async handleJoinConversation(socket, data) {
    try {
      const { conversationId } = data;

      // Check user có tham gia conversation không
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: socket.userId,
        status: "active",
      });

      if (!participant) {
        socket.emit("error", {
          message: "Bạn không có quyền truy cập conversation này",
        });
        return;
      }

      socket.join(`conversation_${conversationId}`);
      socket.emit("joined_conversation", { conversationId });
    } catch (error) {
      socket.emit("error", { message: "Không thể join conversation" });
    }
  }

  async handleLeaveConversation(socket, data) {
    try {
      const { conversationId } = data;
      socket.leave(`conversation_${conversationId}`);
      socket.emit("left_conversation", { conversationId });
    } catch (error) {
      socket.emit("error", { message: "Không thể leave conversation" });
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const {
        conversationId,
        content,
        messageType = "text",
        replyTo,
        attachments,
      } = data;

      // Kiểm tra user có tham gia conversation không
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: socket.userId,
        status: "active",
      });

      if (!participant) {
        socket.emit("error", {
          message: "Bạn không có quyền gửi message trong conversation này",
        });
        return;
      }

      if (!participant.permissions.can_send_messages) {
        socket.emit("error", { message: "Bạn không có quyền gửi message" });
        return;
      }

      // Tạo message
      const message = new ChatMessage({
        conversation_id: conversationId,
        sender_id: socket.userId,
        content,
        message_type: messageType,
        reply_to: replyTo,
        attachments,
      });

      await message.save();

      // Populate message
      const populatedMessage = await ChatMessage.findById(message._id)
        .populate("sender_id", "name username email avatar")
        .populate("reply_to", "content sender_id")
        .lean();

      // Gửi message đến tất cả participants trong conversation
      console.log(`Emitting new_message to conversation_${conversationId}`);
      console.log(`Message content: ${populatedMessage.content}`);
      this.io.to(`conversation_${conversationId}`).emit("new_message", {
        conversationId,
        message: populatedMessage,
      });

      // Gửi notification đến các user không online
      await this.sendOfflineNotifications(conversationId, populatedMessage);
    } catch (error) {
      socket.emit("error", { message: "Không thể gửi message" });
    }
  }

  async handleTyping(socket, data) {
    try {
      const { conversationId } = data;

      // Kiểm tra user có tham gia conversation không
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: socket.userId,
        status: "active",
      });

      if (!participant) return;

      // Gửi typing event đến các user khác trong conversation
      socket.to(`conversation_${conversationId}`).emit("user_typing", {
        conversationId,
        userId: socket.userId,
        userName: socket.user.name,
      });
    } catch (error) {
      console.error("Error handling typing:", error);
    }
  }

  async handleStopTyping(socket, data) {
    try {
      const { conversationId } = data;

      // Gửi stop typing event đến các user khác trong conversation
      socket.to(`conversation_${conversationId}`).emit("user_stop_typing", {
        conversationId,
        userId: socket.userId,
        userName: socket.user.name,
      });
    } catch (error) {
      console.error("Error handling stop typing:", error);
    }
  }

  async handleMarkAsRead(socket, data) {
    try {
      const { conversationId, messageId } = data;

      // Cập nhật read status
      await ChatMessage.findByIdAndUpdate(messageId, {
        $addToSet: {
          read_by: {
            user_id: socket.userId,
            read_at: new Date(),
          },
        },
      });

      // Cập nhật participant stats
      await ChatParticipant.findOneAndUpdate(
        {
          conversation_id: conversationId,
          user_id: socket.userId,
        },
        {
          $set: {
            "stats.unread_count": 0,
            "stats.last_seen_at": new Date(),
          },
        }
      );

      // Gửi read receipt đến các user khác
      socket.to(`conversation_${conversationId}`).emit("message_read", {
        conversationId,
        messageId,
        userId: socket.userId,
        userName: socket.user.name,
      });
    } catch (error) {
      socket.emit("error", { message: "Không thể đánh dấu đã đọc" });
    }
  }

  async handleAddReaction(socket, data) {
    try {
      const { messageId, emoji } = data;

      const message = await ChatMessage.findById(messageId);
      if (!message) {
        socket.emit("error", { message: "Message không tồn tại" });
        return;
      }

      // Kiểm tra user đã reaction chưa
      const existingReaction = message.reactions.find(
        (r) =>
          r.user_id.toString() === socket.userId.toString() && r.emoji === emoji
      );

      if (existingReaction) {
        socket.emit("error", { message: "Bạn đã reaction emoji này rồi" });
        return;
      }

      message.reactions.push({
        user_id: socket.userId,
        emoji: emoji,
      });

      await message.save();

      // Gửi reaction đến tất cả participants
      this.io
        .to(`conversation_${message.conversation_id}`)
        .emit("reaction_added", {
          messageId,
          emoji,
          userId: socket.userId,
          userName: socket.user.name,
        });
    } catch (error) {
      socket.emit("error", { message: "Không thể thêm reaction" });
    }
  }

  async handleRemoveReaction(socket, data) {
    try {
      const { messageId, emoji } = data;

      const message = await ChatMessage.findById(messageId);
      if (!message) {
        socket.emit("error", { message: "Message không tồn tại" });
        return;
      }

      message.reactions = message.reactions.filter(
        (r) =>
          !(
            r.user_id.toString() === socket.userId.toString() &&
            r.emoji === emoji
          )
      );

      await message.save();

      // Gửi reaction removal đến tất cả participants
      this.io
        .to(`conversation_${message.conversation_id}`)
        .emit("reaction_removed", {
          messageId,
          emoji,
          userId: socket.userId,
          userName: socket.user.name,
        });
    } catch (error) {
      socket.emit("error", { message: "Không thể xóa reaction" });
    }
  }

  async sendOfflineNotifications(conversationId, message) {
    try {
      // Lấy danh sách participants
      const participants = await ChatParticipant.find({
        conversation_id: conversationId,
        status: "active",
      });

      // Gửi notification đến các user không online
      participants.forEach(async (participant) => {
        const isOnline = this.io.sockets.adapter.rooms.has(
          `user_${participant.user_id}`
        );
        if (!isOnline) {
          // Tăng unread count
          await ChatParticipant.findByIdAndUpdate(participant._id, {
            $inc: { "stats.unread_count": 1 },
          });

          // Có thể gửi push notification ở đây
          console.log(
            `Sending offline notification to user ${participant.user_id}`
          );
        }
      });
    } catch (error) {
      console.error("Error sending offline notifications:", error);
    }
  }

  handleDisconnect(socket) {
    // Có thể thêm logic cleanup ở đây
  }

  // Method để gửi message từ server
  sendMessageToConversation(conversationId, event, data) {
    console.log(
      `[SocketManager] Emitting ${event} to conversation_${conversationId}`
    );
    console.log(`[SocketManager] Data:`, JSON.stringify(data, null, 2));
    this.io.to(`conversation_${conversationId}`).emit(event, data);
  }

  // Method để gửi message đến user cụ thể
  sendMessageToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }
}

module.exports = SocketManager;
