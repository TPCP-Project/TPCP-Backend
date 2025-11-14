const Joi = require("joi");

const registerValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      "string.min": "Tên phải có ít nhất 2 ký tự",
      "string.max": "Tên không được phép vượt quá 50 ký tự",
      "any.required": "Tên là bắt buộc!!",
    }),
    username: Joi.string().min(3).max(30).alphanum().required().messages({
      "string.min": "Username phải có ít nhất 3 ký tự",
      "string.max": "Username không được phép vượt quá 30 ký tự",
      "string.alphanum": "Username chỉ được chứa chữ cái và số",
      "any.required": "Username là bắt buộc!!",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Email không hợp lệ",
      "any.required": "Email là bắt buộc",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
      "any.required": "Mật khẩu là bắt buộc",
    }),
    bio: Joi.string().max(1000).optional().messages({
      "string.max": "Bio không được phép vượt quá 1000 ký tự",
    }),
  });

  return schema.validate(data);
};

const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email không hợp lệ",
      "any.required": "Email là bắt buộc",
    }),
    password: Joi.string().required().messages({
      "any.required": "Mật khẩu là bắt buộc",
    }),
  });

  return schema.validate(data);
};

const changePasswordValidation = (data) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "Mật khẩu hiện tại là bắt buộc",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
      "any.required": "Mật khẩu mới là bắt buộc",
    }),
  });

  return schema.validate(data);
};

const forgotPasswordValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email không hợp lệ",
      "any.required": "Email là bắt buộc",
    }),
  });

  return schema.validate(data);
};

const resetPasswordValidation = (data) => {
  const schema = Joi.object({
    token: Joi.string().required().messages({
      "any.required": "Token là bắt buộc",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
      "any.required": "Mật khẩu mới là bắt buộc",
    }),
  });

  return schema.validate(data);
};

const updateProfileValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).optional().messages({
      "string.min": "Tên phải có ít nhất 2 ký tự",
      "string.max": "Tên không được vượt quá 50 ký tự",
    }),
    bio: Joi.string().max(500).optional().messages({
      "string.max": "Bio không được vượt quá 500 ký tự",
    }),
    skills: Joi.array()
      .items(
        Joi.object({
          skill: Joi.string().required().messages({
            "any.required": "Tên kỹ năng là bắt buộc",
            "string.empty": "Tên kỹ năng không được rỗng",
          }),
          level: Joi.number().min(1).max(10).required().messages({
            "any.required": "Level kỹ năng là bắt buộc",
            "number.min": "Level kỹ năng phải từ 1 trở lên",
            "number.max": "Level kỹ năng không được quá 10",
          }),
        })
      )
      .optional(),
  });

  return schema.validate(data);
};

module.exports = {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
};
