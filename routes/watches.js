const express = require("express");
const router = express.Router();
const pg = require("../connection");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const Joi = require("@hapi/joi");

router.get("/", async (req, res) => {
  try {
    const watches = await pg("watches").select("*");
    res.send(watches);
  } catch (ex) {
    res.status(400).send(ex);
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const watch = await pg("watches")
      .select("*")
      .where("id", "=", req.params.id);
    if (!watch[0]) return res.status(400).send("Product not found.");

    res.send(watch[0]);
  } catch (ex) {
    res.status(400).send(ex);
  }
});

router.post("/", [auth, admin], async (req, res) => {
  const { error } = validateWatch(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const { title, description, price, quantity, image_path } = req.body;
    const watch = await pg("watches")
      .insert({
        title,
        description,
        price,
        quantity,
        image_path
      })
      .returning("*");
    if (!watch) return res.status(400).send("Something went wrong");
    res.send(watch[0]);
  } catch (ex) {
    res.status(400).send(ex);
  }
});

router.put("/:id", [auth, admin], async (req, res) => {
  const { error } = validateWatch(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const { title, description, price, quantity, image_path } = req.body;
    const { id } = req.params;

    const watch = await pg("watches")
      .where("id", "=", id)
      .update(
        {
          title,
          description,
          price,
          quantity,
          image_path
        },
        "*"
      );
    if (!watch[0])
      return res.status(400).send("That product is not in our database");
    res.send(watch[0]);
  } catch (ex) {
    res.status(400).send(ex);
  }
});

router.delete("/:id", [auth, admin], async (req, res) => {
  try {
    const deleted = await pg("watches")
      .where("id", "=", req.params.id)
      .returning("*")
      .del();
    if (!deleted[0]) return res.status(400).send("Product not found");
    res.send(deleted[0]);
  } catch (ex) {
    res.status(400).send("Something went wrong");
  }
});

module.exports = router;

function validateWatch(data) {
  const schema = Joi.object({
    title: Joi.string()
      .max(255)
      .required(),
    description: Joi.string()
      .max(255)
      .allow(""),
    price: Joi.number()
      .min(0)
      .required()
      .precision(2),
    quantity: Joi.number()
      .min(0)
      .integer()
      .required(),
    image_path: Joi.string().allow("")
  });
  return Joi.validate(data, schema);
}
