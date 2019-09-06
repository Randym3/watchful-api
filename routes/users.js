const express = require("express");
const router = express.Router();
const pg = require("../connection");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("config");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", [auth, admin], async (req, res) => {
  try {
    const users = await pg("users").select("*");
    res.send(users);
  } catch (ex) {
    res.status(400).send(ex);
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await pg("users")
      .where("id", "=", req.user.id)
      .select("*");
    res.send(user[0]);
  } catch (ex) {
    res.status(400).send(ex);
  }
});

router.post("/", async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  try {
    //checking if user with same email already exists
    let user = await pg("users")
      .select("*")
      .where("email", "=", req.body.email);
    //return error if user exists
    if (user[0])
      return res
        .status(400)
        .send("That email is already registered to another user.");
    //if no user exists the following code will be excuted
    //hashing password before insert
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);

    //Inerting new user into postgresql and returning everything.
    user = await pg("users")
      .insert({
        name: req.body.name,
        email: req.body.email,
        password: hash
      })
      .returning("*");

    const token = generateToken(user[0]);

    res.header("x-auth-token", token).send(user[0]);
  } catch (ex) {
    res.status(400).send(ex);
  }
});

router.put("/me", auth, async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const { name, email, password } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = await pg("users")
      .where("id", "=", req.user.id)
      .update(
        {
          name,
          email,
          password: hash
        },
        ["*"]
      );
    if (!newUser[0]) return res.status(400).send("No user found");
    res.send(newUser[0]);
  } catch (ex) {
    res.status(400).send(ex);
  }
});

router.delete("/me", auth, async (req, res) => {
  try {
    const deleted = await pg("users")
      .where("id", "=", req.user.id)
      .returning("*")
      .del();
    if (!deleted[0]) return res.status(400).send("User not found");
    res.send(deleted[0]);
  } catch (ex) {
    res.status(400).send("Something went wrong");
  }
});

module.exports = router;

function validateUser(data) {
  const schema = Joi.object({
    name: Joi.string()
      .min(5)
      .max(50)
      .required(),
    email: Joi.string()
      .required()
      .email({ minDomainSegments: 2 }),
    password: Joi.string()
      .min(3)
      .max(1024)
      .required()
  });
  return Joi.validate(data, schema);
}

function generateToken(user) {
  const token = jwt.sign(
    { id: user.id, isAdmin: user.isadmin },
    config.get("tokenKey")
  );

  return token;
}
