import Router from "koa-router";
import Redis from "koa-redis";
import nodeMailer from "nodemailer";
import User from "../dbs/models/users";
import Passport from "./utils/passport";
import Email from "../dbs/config";
import axios from "./utils/axios";
let router = new Router({
  prefix: "/users"
});
let Store = new Redis().client;
router.post("/signup", async ctx => {
  const { username, password, email, code } = ctx.request.body;
  if (code) {
    const saveCode = await Store.hget(`nodemail:${username}`, "code");
    const saveExpire = await Store.hget(`nodemail:${username}`, "expire");
    if (code === saveCode) {
      if (new Date().getTime() - saveExpire > 0) {
        ctx.body = {
          code: -1,
          msg: "验证码过期"
        };
        return false;
      }
    } else {
      ctx.body = {
        code: -1,
        msg: "请输入正确的验证码"
      };
    }
  } else {
    ctx.body = {
      code: -1,
      msg: "请输入验证码"
    };
  }
  let user = await User.find({
    username
  });
  if (user.length) {
    ctx.body = {
      code: -1,
      msg: "用户名已经被注册"
    };
    return;
  }
  let nuser = await User.create({ username, password, email });
  if (nuser) {
    let res = await axios.post("/users/signin", {
      username,
      password
    });

    if (res.data && res.data.code === 0) {
      ctx.body = {
        code: 0,
        msg: "注册成功",
        user: res.data.user
      };
    } else {
      ctx.body = {
        code: -1,
        msg: "error"
      };
    }
  } else {
    ctx.body = {
      code: -1,
      msg: "注册失败"
    };
  }
});
router.post("/signin", async (ctx, next) => {
  return Passport.authenticate("local", (err, user, inf, status) => {
    if (err) {
      ctx.body = {
        code: -1,
        msg: err
      };
    } else {
      if (user) {
        ctx.body = {
          code: 0,
          msg: "登陆成功",
          user
        };
        return ctx.login(user);
      } else {
        ctx.body = {
          code: -1,
          msg: inf
        };
      }
    }
  })(ctx, next);
});

router.post("/verify", async (ctx, next) => {
  let username = ctx.request.body.username;
  const saveExpire = await Store.hget(`nodemail:${username}`, "expire");
  if (saveExpire && new Date().getTime() - saveExpire < 0) {
    ctx.body = {
      code: -1,
      msg: "请求太过频繁"
    };
    return false;
  }
  let transporter = nodeMailer.createTransport({
    host: Email.smtp.host,
    port: 587,
    secure: false,
    auth: {
      user: Email.smtp.user,
      pass: Email.smtp.pass
    }
  });
  let ko = {
    code: Email.smtp.code(),
    expier: Email.smtp.expire(),
    email: ctx.request.body.email,
    user: ctx.request.body.username
  };
  let mailOptions = {
    from: `"认证邮件" < ${Email.smtp.user} >`,
    to: ko.email,
    subject: "<美团实战注册码>",
    html: `你的邀请码是${ko.code}，请在1分钟内使用`
  };
  await transporter.sendMail(mailOptions, (err, inf) => {
    if (err) {
      return console.log(err);
    } else {
      Store.hmset(
        `nodemail${ko.user}`,
        "code",
        ko.code,
        "expire",
        ko.expier,
        "email",
        ko.email
      );
    }
  });
  ctx.body = {
    code: 0,
    msg: "验证码已发送，有效期1分钟"
  };
});

router.get("/exit", async (ctx, next) => {
  await ctx.logout();
  if (!ctx.isAuthenticated()) {
    ctx.body = {
      code: 0
    };
  } else {
    ctx.body = {
      code: -1
    };
  }
});
router.get("/getUser", async ctx => {
  if (ctx.isAuthenticated()) {
    const { username, email } = ctx.session.passport.user;
    ctx.body = {
      user: username,
      email
    };
  } else {
    ctx.body = {
      user: "",
      email: ""
    };
  }
});
export default router;
