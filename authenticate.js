const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/user");
const Campsite = require("./models/campsite");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const jwt = require("jsonwebtoken");

const config = require("./config.js");

exports.local = passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

exports.getToken = (user) => {
  return jwt.sign(user, config["secret-key"], { expiresIn: 3600 });
};

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = config["secret-key"];

exports.jwtPassport = passport.use(
  new JwtStrategy(opts, (jwt_payload, done) => {
    console.log("jwt patload:", jwt_payload);
    User.findOne({ _id: jwt_payload._id }, (err, user) => {
      if (err) {
        return done(err, false);
      } else if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    });
  })
);

exports.verifyUser = passport.authenticate("jwt", { session: false });
exports.verifyAdmin = (req, res, next) => {
  if (req.user.admin) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "plain/text");
    next();
  } else {
    const err = new Error("You are not authorized to enter!");
    res.statusCode = 403;
    next(err);
  }
};
exports.identifyAuthor = (req, res, next) => {
  Campsite.findById({ _id: req.params.campsiteId })
    .then((campsite) => {
      if (campsite && campsite.comments.id(req.params.commentId)) {
        const comment = campsite.comments.id(req.params.commentId);
        if (comment && comment.author === req.user._id) {
          res.statusCode = 200;
          next();
        }
      } else {
        const err = new Error("No comment/campsite found.");
        res.statusCode = 403;
        next(err);
      }
    })
    .catch((err) => next(err));
};
