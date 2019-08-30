const bcrypt = require("bcrypt");
const Joi = require("@hapi/joi");
const pg = require("../connection");
const express = require("express");
const router = express.Router();
const config = require("config");
const jwt = require("jsonwebtoken");

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  try {
    let user = await pg("users")
      .select("*")
      .where("email", "=", req.body.email);
    user = user[0];
    if (!user) return res.status(400).send("Incorrect email or password");

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (!validPassword)
      return res.status(400).send("Incorrect email or password");

    const token = generateToken(user);

    res
      .header("x-auth-token", token)
      .send({ id: user.id, name: user.name, email: user.email });
  } catch (ex) {
    console.log(ex);
    return res.status(400).send(ex);
  }
});

function validate(user) {
  const schema = Joi.object({
    email: Joi.string()
      .required()
      .email({ minDomainSegments: 2 }),
    password: Joi.string()
      .min(3)
      .max(1024)
      .required()
  });
  return Joi.validate(user, schema);
}
function generateToken(user) {
  const token = jwt.sign(
    { id: user.id, isAdmin: user.isadmin },
    config.get("tokenKey")
  );

  return token;
}
module.exports = router;
